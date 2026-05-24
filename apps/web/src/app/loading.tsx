export default function HomeLoading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gray-100 dark:bg-gray-900/50 overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 animate-in fade-in duration-300"
        style={{
          width: '70%',
          animation: 'loading-bar 1.5s infinite ease-in-out',
          boxShadow: '0 0 8px rgba(245, 158, 11, 0.5)'
        }} 
      />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}} />
    </div>
  );
}
