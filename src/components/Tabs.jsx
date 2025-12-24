import React, { useState } from 'react';
import '../styles/vscode-theme.css';

function Tabs() {
  const [tabs, setTabs] = useState([
    { id: 1, title: 'Tab 1', content: 'Content of Tab 1' },
    { id: 2, title: 'Tab 2', content: 'Content of Tab 2' },
    { id: 3, title: 'Tab 3', content: 'Content of Tab 3' },
  ]);
  const [activeTab, setActiveTab] = useState(1);

  const closeTab = (id) => {
    setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== id));
    if (activeTab === id && tabs.length > 1) {
      const idx = tabs.findIndex((tab) => tab.id === id);
      const nextTab = tabs[idx === 0 ? 1 : idx - 1];
      setActiveTab(nextTab.id);
    }
  };

  return (
    <div className="tabs-container">
      <div className="tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab${tab.id === activeTab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.title}
            <button className="close-btn" onClick={e => { e.stopPropagation(); closeTab(tab.id); }}>×</button>
          </div>
        ))}
      </div>
      <div className="tab-content">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

export default Tabs;
