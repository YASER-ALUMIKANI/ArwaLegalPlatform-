import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService } from '../../../services/ai.service';

export default function AiAssistant() {
  const queryClient = useQueryClient();
  const [aiQuery, setAiQuery] = useState('');
  const [localHistory, setLocalHistory] = useState([]);
  const chatEndRef = useRef(null);

  // Fetch initial chat history
  const { data: initialHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['aiHistory'],
    queryFn: aiService.getHistory,
  });

  // Keep local history in sync with query data
  useEffect(() => {
    if (initialHistory.length > 0) {
      setLocalHistory(initialHistory);
    }
  }, [initialHistory]);

  const sendAiMutation = useMutation({
    mutationFn: (content) => aiService.sendMessage(content),
    onMutate: async (newQuery) => {
      // Append temporary user message immediately for responsiveness
      const tempUserMsg = { id: 'temp-user', role: 'user', content: newQuery, created_at: new Date().toISOString() };
      setLocalHistory(prev => [...prev, tempUserMsg]);
      return { tempUserMsg };
    },
    onSuccess: (assistantMsg, newQuery, context) => {
      // Remove temp message and append both user and assistant messages
      setLocalHistory(prev => [
        ...prev.filter(m => m.id !== 'temp-user'),
        context.tempUserMsg,
        assistantMsg
      ]);
      queryClient.invalidateQueries({ queryKey: ['aiHistory'] });
    },
    onError: () => {
      // Clean up temp message on error
      setLocalHistory(prev => prev.filter(m => m.id !== 'temp-user'));
    }
  });

  const handleSendAiQuery = (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    const content = aiQuery;
    setAiQuery('');
    sendAiMutation.mutate(content);
  };

  // Scroll to bottom when message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localHistory, sendAiMutation.isPending]);

  return (
    <div className="ai-assistant-container">
      <h1>🧠 المساعد القانوني الذكي (التشريع اليمني)</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
        اسأل المساعد الذكي حول القوانين التجارية والمدنية وقوانين الأحوال الشخصية في الجمهورية اليمنية.
      </p>
      
      <div className="ai-chat-box" id="ai-chat-box" style={{ overflowY: 'auto', maxHeight: '450px', padding: '10px' }}>
        {localHistory.map((msg, idx) => (
          <div key={msg.id || idx} className={`ai-bubble ${msg.role}`}>
            <p style={{ fontWeight: 'bold', color: 'var(--accent-gold)', fontSize: '0.8rem', marginBottom: '4px' }}>
              {msg.role === 'user' ? '👤 أنت' : '🧠 مستشار أروى الذكي'}
            </p>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
          </div>
        ))}
        {sendAiMutation.isPending && (
          <div className="typing-indicator">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '6px' }}>أروى تفكر</span>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
        {localHistory.length === 0 && !sendAiMutation.isPending && !historyLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto', color: 'var(--text-secondary)', maxWidth: '400px', paddingTop: '40px' }}>
            <span style={{ fontSize: '3rem' }}>🧠</span>
            <h3>اسأل عن القوانين اليمنية</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '8px', textAlign: 'center' }}>
              اكتب سؤالك بالأسفل مثل "ما هي شروط تأسيس شركة تضامن؟" أو "ما شروط طرد المستأجر في القانون اليمني؟"
            </p>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      
      <form onSubmit={handleSendAiQuery} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <input 
          type="text" 
          value={aiQuery} 
          onChange={(e) => setAiQuery(e.target.value)} 
          className="form-input" 
          placeholder="اكتب استشارتك القانونية هنا..."
          style={{ flex: 1 }}
          required 
          disabled={sendAiMutation.isPending}
        />
        <button type="submit" className="btn btn-primary" disabled={sendAiMutation.isPending}>
          {sendAiMutation.isPending ? 'جاري الإرسال...' : 'إرسال الاستفسار ⚡'}
        </button>
      </form>
    </div>
  );
}
