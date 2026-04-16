// packages/extension/entrypoints/popup/App.tsx
import { ExtensionPopup } from './components/ExtensionPopup';
import './App.css';

function App() {
  return (
    <div className="p-4 bg-white min-w-[400px]">
      <ExtensionPopup />
    </div>
  );
}

export default App;