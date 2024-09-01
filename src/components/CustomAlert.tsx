export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface CustomAlertProps {
  type: AlertType;
  message: string;
  onClose: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({ type, message, onClose }) => {
  const alertStyles: Record<AlertType, string> = {
    success: 'bg-green-100 border-green-400 text-green-800',
    error: 'bg-red-100 border-red-400 text-red-800',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    info: 'bg-blue-100 border-blue-400 text-blue-800',
  };

  return (
    <div
      className={`z-20 absolute left-[50%] -translate-x-[50%] w-full max-w-lg mx-auto border-l-4 p-4 rounded-md shadow-lg flex items-center justify-between space-x-4 ${alertStyles[type]}`}
    >
      <div className="flex items-center">
        <p className="ml-3 text-sm font-medium" style={{overflowWrap: "anywhere"}}>{message}</p>
      </div>
      <button
        onClick={onClose}
        style={{padding: "0 0.7rem 0.2em 0.7rem"}}
        className="text-4xl text-gray-700 hover:text-gray-900 transition-colors rounded-full hover:outline outline-2"
      >
        ×
      </button>
    </div>
  );
};

export default CustomAlert;