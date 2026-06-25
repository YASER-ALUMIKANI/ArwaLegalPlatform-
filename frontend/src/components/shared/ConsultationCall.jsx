import React, { useEffect, useRef, useState } from 'react';
import { getConsultationWebSocketUrl } from '../../config/api';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export default function ConsultationCall({
  consultationId,
  userId,
  localLabel,
  remoteLabel,
  localAvatar,
  remoteAvatar,
  onLeave,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [statusText, setStatusText] = useState('جاري تهيئة الاتصال الصوتي...');
  const [mediaError, setMediaError] = useState('');

  useEffect(() => {
    let closed = false;

    const sendSignal = (payload) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(payload));
      }
    };

    const createOffer = async () => {
      const peer = peerRef.current;
      if (!peer || peer.signalingState !== 'stable') return;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendSignal({ type: 'offer', sdp: offer });
    };

    const startCall = async () => {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setVideoActive(false);
        }

        if (closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerRef.current = peer;
        remoteStreamRef.current = new MediaStream();

        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal({ type: 'candidate', candidate: event.candidate });
          }
        };

        peer.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            remoteStreamRef.current.addTrack(track);
          });
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
          }
          setRemoteConnected(true);
          setStatusText('الاتصال الصوتي نشط.');
        };

        peer.onconnectionstatechange = () => {
          if (peer.connectionState === 'connected') {
            setStatusText('الاتصال الصوتي نشط.');
            setRemoteConnected(true);
          }
          if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) {
            setStatusText('انقطع اتصال الطرف الآخر.');
            setRemoteConnected(false);
          }
        };

        const socketUrl = getConsultationWebSocketUrl(consultationId);
        if (!socketUrl) {
          setMediaError('لا يمكن فتح قناة الاتصال لهذه الاستشارة.');
          return;
        }

        const socket = new WebSocket(socketUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          setStatusText('بانتظار دخول الطرف الآخر...');
        };

        socket.onmessage = async (event) => {
          const message = JSON.parse(event.data);
          if (message.sender_id === userId) return;

          if (message.type === 'session-notes-updated') {
            window.dispatchEvent(new CustomEvent('consultation-session-notes', {
              detail: {
                consultationId,
                sessionNotes: message.session_notes || ''
              }
            }));
            return;
          }

          if (message.type === 'peer-joined') {
            setStatusText('الطرف الآخر متصل. جاري تشغيل الصوت...');
            await createOffer();
            return;
          }

          if (message.type === 'offer') {
            await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            sendSignal({ type: 'answer', sdp: answer });
            return;
          }

          if (message.type === 'answer') {
            await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
            return;
          }

          if (message.type === 'candidate' && message.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(message.candidate));
            return;
          }

          if (message.type === 'peer-left') {
            setRemoteConnected(false);
            setStatusText('غادر الطرف الآخر غرفة الاستشارة.');
          }
        };

        socket.onerror = () => {
          setStatusText('تعذر فتح قناة الاتصال المباشر.');
        };
      } catch {
        setMediaError('تعذر الوصول إلى الميكروفون أو الكاميرا. تأكد من منح الصلاحيات للمتصفح.');
      }
    };

    startCall();

    return () => {
      closed = true;
      socketRef.current?.close();
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [consultationId, userId]);

  const toggleMic = () => {
    const next = !micActive;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicActive(next);
  };

  const toggleVideo = () => {
    const next = !videoActive;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setVideoActive(next);
  };

  return (
    <div className="call-media-stack">
      <div className={`call-status-badge ${remoteConnected ? 'connected' : ''}`}>
        {mediaError || statusText}
      </div>

      <div className="video-feed-mock remote">
        <video ref={remoteVideoRef} className="call-video" autoPlay playsInline />
        {!remoteConnected && <div className="video-avatar">{remoteAvatar}</div>}
        <span className="video-feed-label">{remoteLabel}</span>
      </div>

      <div className="video-feed-mock">
        <video ref={localVideoRef} className={`call-video ${!videoActive ? 'hidden' : ''}`} autoPlay playsInline muted />
        {!videoActive && <div style={{ color: 'var(--text-secondary)' }}>الكاميرا مغلقة</div>}
        {!localStreamRef.current?.getVideoTracks().length && videoActive && <div className="video-avatar">{localAvatar}</div>}
        {!micActive && <span className="video-feed-overlay-muted">الميكروفون صامت</span>}
        <span className="video-feed-label">{localLabel}</span>
      </div>

      <div className="video-controls-bar">
        <button type="button" className={`btn-circle ${!micActive ? 'active-off' : ''}`} onClick={toggleMic}>
          {micActive ? '🎙️' : '🔇'}
        </button>
        <button type="button" className={`btn-circle ${!videoActive ? 'active-off' : ''}`} onClick={toggleVideo}>
          {videoActive ? '📷' : '🚫'}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          style={{ borderRadius: '24px', padding: '0 20px', fontSize: '0.85rem' }}
          onClick={onLeave}
        >
          إنهاء الاستشارة
        </button>
      </div>
    </div>
  );
}
