
import React, { useState, useEffect } from 'react';
import '../styles/vscode-theme.css';
import UserManagementTab from './UserManagementTab';

function Tabs() {
  const [tabs, setTabs] = useState([
    { id: 1, title: 'Tab 1', content: 'Content of Tab 1', type: 'string' },
    { id: 2, title: 'Tab 2', content: 'Content of Tab 2', type: 'string' },
    { id: 3, title: 'Tab 3', content: 'Content of Tab 3', type: 'string' },
    { id: 4, title: 'User Management', content: UserManagementTab, type: 'component' },
  ]);
  const [activeTab, setActiveTab] = useState(1);

  // Listen for 'openTab' event to open Add Airport tab
  useEffect(() => {
    function handleOpenTab(e) {
      if (e.detail && e.detail.tab === 'add_airport') {
        // Check if Add Airport tab already exists
        let addAirportTab = tabs.find(tab => tab.title === 'Add Airport');
        if (!addAirportTab) {
          const newId = tabs.length ? Math.max(...tabs.map(t => t.id)) + 1 : 1;
          addAirportTab = {
            id: newId,
            title: 'Add Airport',
            content: document.getElementById('add-airport-fragment')?.innerHTML || 'Add Airport Form'
          };
          setTabs(prevTabs => [...prevTabs, addAirportTab]);
          setActiveTab(newId);
        } else {
          setActiveTab(addAirportTab.id);
        }
      }
    }
    window.addEventListener('openTab', handleOpenTab);
    return () => window.removeEventListener('openTab', handleOpenTab);
  }, [tabs]);

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
        {(() => {
          const activeTabData = tabs.find((tab) => tab.id === activeTab);
          if (!activeTabData) return null;
          if (activeTabData.type === 'component') {
            const Component = activeTabData.content;
            return <Component />;
          }
          return activeTabData.content;
        })()}
      </div>
    </div>
  );
}

export default Tabs;
