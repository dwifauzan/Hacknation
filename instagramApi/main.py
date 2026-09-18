"""MVP: bot-safe login + DM inbox (list / read / reply).

Usage (from this folder, nothing committed):
    ./venv/bin/python main.py                        # login only (reuse session)
    ./venv/bin/python main.py --check                # validate session only
    ./venv/bin/python main.py --inbox 20             # login + list 20 threads
    ./venv/bin/python main.py --read THREAD_ID       # login + show 20 msgs
    ./venv/bin/python main.py --send THREAD_ID --text "hi"   # login + reply once
"""
import argparse
import getpass
import os
import sys

from dotenv import load_dotenv

from ig_client import SESSION_FILE, create_client, password_login_and_save, secure_session_perms, try_session_login

_env_dir = os.path.dirname(__file__)
_env_file = os.path.join(_env_dir, ".env")
# Secrets must come from the ignored .env file or the process environment.
load_dotenv(_env_file)


def _prompt_creds():
    username = os.environ.get("IG_USERNAME") or input("Instagram username: ").strip()
    password = os.environ.get("IG_PASSWORD")
    if not password:
        password = getpass.getpass("Instagram password (hidden, not stored): ")
    return username, password


def main() -> int:
    parser = argparse.ArgumentParser(description="Bot-safe Instagram login + DMs")
    parser.add_argument("--check", action="store_true",
                        help="Only validate existing session.json, never prompt/login")
    parser.add_argument("--proxy", default=os.environ.get("IG_PROXY"),
                        help="Stable proxy URL (optional, keep same across runs)")
    parser.add_argument("--inbox", type=int, default=0, metavar="N",
                        help="List N most recent DM threads after login")
    parser.add_argument("--read", default="", metavar="THREAD_ID",
                        help="Show recent messages from one thread after login")
    parser.add_argument("--send", default="", metavar="THREAD_ID",
                        help="Reply once to this thread id (requires --text)")
    parser.add_argument("--text", default="", help="Reply text for --send")
    parser.add_argument("--auto-once", action="store_true",
                        help="Process visible new DMs once with the AI and reply")
    parser.add_argument("--db", default=os.path.join(os.path.dirname(__file__), "dm_store.sqlite3"),
                        help="SQLite path for duplicate claims and reply logs")
    parser.add_argument("--my-user-id", default=os.environ.get("IG_MY_USER_ID", ""),
                        help="Optional override; otherwise read from the authenticated session")
    parser.add_argument("--amount", type=int, default=20,
                        help="Messages to fetch for --read (default 20)")
    args = parser.parse_args()

    if args.send and not args.text.strip():
        print("ERROR: --send requires --text \"message\".", file=sys.stderr)
        return 1
    client = create_client(proxy=args.proxy)
    secure_session_perms(SESSION_FILE)  # session.json holds sessionid/tokens

    # 1) Dodge path: reuse valid session, no password, no CAA -> no 2FA trigger.
    if try_session_login(client, SESSION_FILE):
        me = client.account_info()
        print(f"OK: session reused, logged in as @{me.username} (pk={me.pk})")
    else:
        if args.check:
            print("NO SESSION: session.json missing/expired. Run without --check to login once.")
            return 1
        if SESSION_FILE.is_file():
            print("Session expired/invalid. Doing ONE fresh login (same device file will be overwritten).")
        username, password = _prompt_creds()
        if not username or not password:
            print("ERROR: username/password required.", file=sys.stderr)
            return 1
        try:
            password_login_and_save(client, username, password, SESSION_FILE)
        except Exception as e:  # mapped below to dodge-guidance
            name = type(e).__name__
            msg = str(e).split("\n")[0][:300]
            print(f"\nLOGIN BLOCKED ({name}): {msg}", file=sys.stderr)
            if "TwoFactor" in name:
                print("-> Instagram wants 2FA. DODGE tip: approve the login in the official\n"
                      "   mobile app on the SAME wifi/IP, wait 10-30 min, then rerun.\n"
                      "   Do NOT retry passwords in a loop (triggers challenge).", file=sys.stderr)
            elif "Challenge" in name:
                print("-> Challenge required. Complete it in the app/browser (same IP),\n"
                      "   then rerun. Do not delete session.json.", file=sys.stderr)
            elif "PleaseWait" in name or "Throttled" in name or "Feedback" in name or "429" in msg:
                print("-> Rate-limited. Wait 1-24h, keep same IP/device, then rerun once.", file=sys.stderr)
            elif "BadPassword" in name or "BadCredentials" in name:
                print("-> Wrong user/pass (or IG rejected password from this IP/device).\n"
                      "   Verify in app, then try once more later.", file=sys.stderr)
            elif "code_entry context_data" in msg or "challenge" in name.lower():
                print("-> Instagram requested an interactive verification checkpoint, but the "
                      "current instagrapi CAA flow did not receive the required context.\n"
                      "   Open Instagram in the official app on a trusted device, approve or "
                      "complete any login/security check, then retry once using the same device "
                      "and network. Do not loop password attempts.", file=sys.stderr)
            return 2
        me = client.account_info()
        print(f"OK: fresh login as @{me.username} (pk={me.pk})")
        print(f"Saved: {SESSION_FILE} -- reuse it next run to avoid 2FA.")

    # The authenticated session is the source of truth for the account id.
    # An explicit value remains available for unusual client/test setups.
    my_user_id = args.my_user_id.strip() or str(
        getattr(me, "pk", "") or getattr(client, "user_id", "") or ""
    )
    if args.auto_once and not my_user_id:
        print("ERROR: authenticated session did not provide an account id.", file=sys.stderr)
        return 1

    # 2) Optional DM actions (only after a valid session — no extra login).
    # Human pacing: login->inbox->read->send back-to-back looks like a bot.
    import time as _time

    from messages import MAX_INBOX, MAX_READ, list_threads, read_thread, reply_to_thread

    if args.inbox > MAX_INBOX:
        print(f"NOTE: --inbox capped {args.inbox}->{MAX_INBOX} to avoid rate-limit.", file=sys.stderr)
    if args.amount > MAX_READ:
        print(f"NOTE: --amount capped {args.amount}->{MAX_READ} to avoid rate-limit.", file=sys.stderr)
    try:
        if args.inbox:
            _time.sleep(2)  # let login settle before inbox fetch
            threads = list_threads(client, args.inbox)
            print(f"\nINBOX ({len(threads)} threads):")
            for t in threads:
                users = ",".join(t["users"][:3])
                print(f"- {t['id']} | {t['title'] or users} | last: {t['last_text'][:80]}")
            print("\nTIP: rerun with --read THREAD_ID. Avoid polling faster than ~1x/min.", file=sys.stderr)
        if args.read:
            _time.sleep(2)
            msgs = read_thread(client, args.read, args.amount)
            print(f"\nTHREAD {args.read} ({len(msgs)} msgs):")
            for m in msgs:
                print(f"[{m['timestamp']}] {m['user_id']}: {m['text'][:200]}")
        if args.send:
            _time.sleep(3)  # extra pause before the one write action
            sent = reply_to_thread(client, args.send, args.text)
            print(f"\nSENT to {args.send}: id={getattr(sent, 'id', '?')}")
            print("TIP: don't double-run; duplicates send twice. Wait for reply.", file=sys.stderr)
        if args.auto_once:
            from agent import process_inbox_once
            from store import Store

            with Store(args.db) as store:
                results = process_inbox_once(
                    client,
                    store,
                    my_user_id=my_user_id,
                    max_threads=min(args.inbox or 20, MAX_INBOX),
                    max_messages=args.amount,
                )
            sent = sum(result.status == "sent" for result in results)
            print(f"\nAI AUTO-REPLY: scanned={len(results)} sent={sent}")
            for result in results:
                if result.status == "sent":
                    print(f"- SENT {result.thread_id}: {result.reply[:120]}")
                elif result.reason:
                    print(f"- SKIP {result.thread_id}: {result.reason}")
    except ValueError as e:
        print(f"\nINVALID INPUT: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        name = type(e).__name__
        print(f"\nDM ACTION FAILED ({name}): {str(e)[:300]}", file=sys.stderr)
        if "LoginRequired" in name or "login_required" in str(e):
            print("-> Session expired. Rerun login once (don't delete session.json unless told).", file=sys.stderr)
        elif "PleaseWait" in name or "Throttled" in name or "Feedback" in name or "429" in str(e):
            print("-> Rate/action-block. STOP 1-24h, same IP/device, smaller --inbox/--amount.", file=sys.stderr)
        elif "NotFound" in name:
            print("-> Bad THREAD_ID. Copy exact id from --inbox output.", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
