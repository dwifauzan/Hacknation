"""Small local HTTP adapter for the Instagram account login screen.

Passwords are accepted only for the duration of the login request. They are
never written to the database, environment, logs, or session settings.
"""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ig_client import (
    SESSION_FILE,
    create_client,
    password_login_and_save,
    secure_session_perms,
    try_session_login,
)

app = FastAPI(title="HackNation Instagram Service", version="1.0")


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=256)


def account_payload(client, username: str) -> dict:
    account = client.account_info()
    return {
        "username": str(getattr(account, "username", None) or username),
        "display_name": str(
            getattr(account, "full_name", None)
            or getattr(account, "username", None)
            or username
        ),
        "user_id": str(getattr(account, "pk", None) or getattr(client, "user_id", "")),
        "session_reference": SESSION_FILE.name,
    }


@app.get("/status")
def status() -> dict:
    if not SESSION_FILE.is_file():
        return {"status": "logged_out"}

    client = create_client()
    secure_session_perms(SESSION_FILE)
    if not try_session_login(client, SESSION_FILE):
        return {"status": "expired"}

    return {"status": "connected", **account_payload(client, "")}


@app.post("/login")
def login(request: LoginRequest) -> dict:
    client = create_client()
    secure_session_perms(SESSION_FILE)

    try:
        if not try_session_login(client, SESSION_FILE):
            if not password_login_and_save(client, request.username, request.password, SESSION_FILE):
                raise HTTPException(status_code=401, detail="Instagram login failed.")
        return {"status": "connected", **account_payload(client, request.username)}
    except HTTPException:
        raise
    except Exception as exception:
        name = type(exception).__name__
        message = str(exception).splitlines()[0][:300]
        raise HTTPException(
            status_code=422,
            detail=f"Instagram login failed ({name}): {message}",
        ) from exception


@app.post("/logout")
def logout() -> dict:
    try:
        SESSION_FILE.unlink(missing_ok=True)
    except OSError as exception:
        raise HTTPException(status_code=500, detail="Could not remove Instagram session.") from exception
    return {"status": "logged_out"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "web_service:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8090")),
    )
