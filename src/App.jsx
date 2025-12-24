import React from 'react';

import './styles/vscode-theme.css';
import Tabs from './components/Tabs';

function App() {
  return (
    <div className="app-container">
      <h1>Financial Simulator</h1>
      <p>Welcome to your VS Code-styled financial simulator!</p>
      <Tabs />
    </div>
  );
}

export default App;
