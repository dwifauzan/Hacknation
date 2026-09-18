import os
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from instagrapi import Client
from instagrapi.exceptions import (
    BadPassword,
    TwoFactorRequired,
    ChallengeRequired,
    LoginRequired,
)
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("instagram-service")

app = FastAPI(title="Instagram Service (instagrapi)")

SESSION_FILE = "session.json"
cl = Client()

class LoginRequest(BaseModel):
    username: str
    password: str
    verification_code: Optional[str] = None

class SendDMRequest(BaseModel):
    username: str
    message: str

def save_session():
    try:
        cl.dump_settings(SESSION_FILE)
        logger.info("Session Instagram berhasil disimpan ke session.json")
    except Exception as e:
        logger.error(f"Gagal menyimpan session: {e}")

def load_session() -> bool:
    if os.path.exists(SESSION_FILE):
        try:
            cl.load_settings(SESSION_FILE)
            cl.get_timeline_feed()
            logger.info("Session terverifikasi dan aktif.")
            return True
        except Exception as e:
            logger.warning(f"Session yang disimpan tidak dapat digunakan: {e}")
    return False

def auto_login() -> bool:
    if load_session():
        return True
    
    ig_user = os.getenv("IG_USERNAME")
    ig_pass = os.getenv("IG_PASSWORD")

    if ig_user and ig_pass:
        try:
            logger.info(f"Mencoba auto-login untuk username: {ig_user}")
            cl.login(ig_user, ig_pass)
            save_session()
            return True
        except Exception as e:
            logger.error(f"Auto-login gagal: {e}")
    return False

@app.on_event("startup")
def startup_event():
    auto_login()

@app.get("/status")
def get_status():
    logged_in = False
    username = None
    try:
        if cl.user_id:
            logged_in = True
            username = cl.username
    except Exception:
        pass
    
    return {
        "status": "online",
        "logged_in": logged_in,
        "username": username
    }

@app.post("/login")
def login(req: LoginRequest):
    try:
        if req.verification_code:
            cl.login(req.username, req.password, verification_code=req.verification_code)
        else:
            cl.login(req.username, req.password)
        save_session()
        return {
            "status": "success",
            "message": f"Berhasil login sebagai @{req.username}",
            "user_id": cl.user_id
        }
    except TwoFactorRequired:
        raise HTTPException(
            status_code=401,
            detail="2FA (Two-Factor Authentication) diperlukan. Silakan sertakan 'verification_code' dalam body request."
        )
    except BadPassword:
        raise HTTPException(status_code=400, detail="Password Instagram salah.")
    except ChallengeRequired as e:
        raise HTTPException(
            status_code=400,
            detail=f"Instagram memerlukan verifikasi tantangan (Challenge Required): {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal login: {str(e)}")

@app.post("/send-dm")
def send_dm(req: SendDMRequest):
    if not req.username or not req.message:
        raise HTTPException(status_code=400, detail="Parameter 'username' dan 'message' wajib diisi.")

    # Cek login status
    if not cl.user_id:
        if not auto_login():
            raise HTTPException(
                status_code=401,
                detail="Instagram client belum login. Silakan panggil POST /login atau atur IG_USERNAME & IG_PASSWORD di .env."
            )

    try:
        # Dapatkan ID user dari username
        user_id = cl.user_id_from_username(req.username)
        # Pengiriman DM
        thread = cl.direct_send(req.message, user_ids=[user_id])
        return {
            "status": "success",
            "message": f"Pesan DM Instagram berhasil dikirim ke @{req.username}",
            "data": {
                "target_username": req.username,
                "target_user_id": str(user_id),
                "thread_id": str(thread.id) if hasattr(thread, 'id') else None
            }
        }
    except LoginRequired:
        raise HTTPException(status_code=401, detail="Sesi Instagram telah berakhir. Silakan login kembali.")
    except Exception as e:
        logger.error(f"Gagal mengirim DM ke @{req.username}: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal mengirim DM Instagram: {str(e)}")
