import { useEffect, useState } from 'react';

export default function Toast({ message, visible }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: '#161a28', border: '1px solid #252b40',
      borderRadius: 9, padding: '11px 18px', fontSize: '.72rem',
      display: 'flex', alignItems: 'center', gap: 9,
      transform: visible ? 'translateY(0)' : 'translateY(60px)',
      opacity: visible ? 1 : 0,
      transition: 'all .3s cubic-bezier(.34,1.56,.64,1)',
      zIndex: 999,
      boxShadow: '0 8px 28px rgba(0,0,0,.4)',
      fontFamily: 'var(--mono)',
      color: 'var(--text)',
    }}>
      {visible && message && message.startsWith('⚙') && (
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          border: '2px solid #252b40', borderTopColor: '#4fffb0',
          animation: 'sp .7s linear infinite',
        }} />
      )}
      <span>{message}</span>
    </div>
  );
}
