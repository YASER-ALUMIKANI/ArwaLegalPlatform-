import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { casesService } from '../../../services/cases.service';

export default function MessagesPanel({ caseId, messages = [], userId }) {
  const queryClient = useQueryClient();
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef(null);

  const sendMessageMutation = useMutation({
    mutationFn: ({ caseId, content }) => casesService.sendMessage(caseId, content),
    onSuccess: () => {
      setChatMessage('');
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    sendMessageMutation.mutate({ caseId, content: chatMessage });
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ marginBottom: '15px' }}>💬 قناة تواصل آمنة ومشفرة</h3>
      <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', padding: '10px' }}>
          {messages.map(m => (
            <div key={m.id} className={`chat-bubble ${m.sender_id === userId ? 'mine' : 'other'}`}>
              <p style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginBottom: '2px' }}>{m.sender_name}</p>
              <p>{m.content}</p>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textAlign: 'left', marginTop: '4px' }}>
                {new Date(m.sent_at).toLocaleTimeString('ar-EG')}
              </span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="chat-input-area" style={{ marginTop: '15px' }}>
          <input 
            type="text" 
            value={chatMessage} 
            onChange={(e) => setChatMessage(e.target.value)} 
            className="form-input" 
            placeholder="اكتب رسالتك للموكل..." 
            disabled={sendMessageMutation.isPending}
          />
          <button type="submit" className="btn btn-primary" disabled={sendMessageMutation.isPending || !chatMessage.trim()}>
            {sendMessageMutation.isPending ? '...' : 'إرسال'}
          </button>
        </form>
      </div>
    </div>
  );
}
