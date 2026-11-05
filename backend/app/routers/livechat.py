"""Livechat: jembatan dari bubble web ke API server Hermes (profil finance) + riwayat chat."""
import json
import urllib.request
import urllib.error

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import ChatSession
from ..security import get_current_user

router = APIRouter(prefix="/api/livechat", tags=["livechat"])


class LivechatRequest(BaseModel):
    message: str
    history: list[dict] = []


class LivechatResponse(BaseModel):
    reply: str
    profile_id: int


class ChatSessionCreate(BaseModel):
    title: str = ""
    messages: list[dict] = []


@router.post("", response_model=LivechatResponse)
def livechat(req: LivechatRequest, user=Depends(get_current_user)):
    if not settings.HERMES_API_KEY:
        raise HTTPException(status_code=503, detail="Livechat belum dikonfigurasi")
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="Pesan kosong")

    system = (
        "Kamu adalah Ayfredo (boci), asisten keuangan pribadi Abriel. "
        f"Pengguna livechat saat ini adalah profil '{user.name}' (id={user.id}). "
        "Jawab singkat dan ramah; catat transaksi/pengeluaran bila diminta."
    )
    messages = [{"role": "system", "content": system}]
    for h in req.history[-20:]:
        role = h.get("role")
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": str(h.get("content", ""))})
    messages.append({"role": "user", "content": req.message})

    body = json.dumps({"model": "hermes", "messages": messages}).encode()
    url = f"{settings.HERMES_API_URL}/p/finance/v1/chat/completions"
    r = urllib.request.Request(url, data=body, method="POST")
    r.add_header("Authorization", f"Bearer {settings.HERMES_API_KEY}")
    r.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:300]
        raise HTTPException(status_code=502, detail=f"Bot gagal: {detail}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Bot tidak terjangkau: {e}")

    try:
        reply = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="Respon bot tidak valid")
    return LivechatResponse(reply=reply, profile_id=user.id)


@router.post("/close", status_code=201)
def close_chat(payload: ChatSessionCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Simpan sesi obrolan yang ditutup ke riwayat (read-only)."""
    clean = [
        m for m in payload.messages
        if isinstance(m, dict) and m.get("role") in ("user", "assistant")
    ]
    session = ChatSession(
        user_id=user.id,
        title=payload.title.strip() or "Obrolan baru",
        messages=json.dumps(clean),
        message_count=len(clean),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id}


@router.get("/history")
def chat_history(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Daftar sesi riwayat (meta saja, tanpa isi pesan)."""
    rows = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "message_count": s.message_count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in rows
    ]


@router.get("/history/{session_id}")
def chat_history_detail(session_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Isi pesan satu sesi riwayat (read-only)."""
    s = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    try:
        messages = json.loads(s.messages) if s.messages else []
    except json.JSONDecodeError:
        messages = []
    return {
        "id": s.id,
        "title": s.title,
        "messages": messages,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }
