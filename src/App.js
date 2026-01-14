import React, { useState } from 'react';
import './App.css';

// Sample project data - in production this would come from an API/database
const sampleProject = {
  id: "RV-2025-0147",
  locationName: "Landmark One",
  address: "15727 Anthem Pkwy, San Antonio, TX 78249",
  employeeCount: 450,
  configuration: "2× Smart Fridge™ + 1× Smart Cooker™",
  projectManager: {
    name: "Ryan Kelly",
    email: "ryan@raptor-vending.com",
    phone: "(385) 438-6325"
  },
  estimatedCompletion: "February 7, 2025",
  daysRemaining: 25,
  overallProgress: 45,
  phases: [
    {
      id: 1,
      title: "Site Assessment & Planning",
      status: "completed",
      startDate: "Jan 6, 2025",
      endDate: "Jan 10, 2025",
      description: "Site survey completed. Optimal placement identified in 4th floor break room. Cellular signal strength verified for reliable transaction processing. Space requirements confirmed.",
      tasks: [
        { label: "Initial site survey and measurements", completed: true },
        { label: "Optimal placement location identified", completed: true },
        { label: "Cellular signal strength verification", completed: true },
        { label: "Space and traffic flow assessment", completed: true },
        { label: "Infrastructure specifications delivered to property", completed: true }
      ]
    },
    {
      id: 2,
      title: "Employee Preference Survey",
      status: "completed",
      startDate: "Jan 10, 2025",
      endDate: "Jan 17, 2025",
      description: "Survey distributed to building employees to capture snack and meal preferences. Results compiled and menu customization planned based on employee favorites.",
      tasks: [
        { label: "Survey link distributed to property management", completed: true },
        { label: "Employee participation (target: 30%+ response rate)", completed: true },
        { label: "Snack preferences compiled", completed: true },
        { label: "Hot meal preferences compiled", completed: true },
        { label: "Custom menu recommendations finalized", completed: true }
      ],
      surveyResults: {
        responseRate: "42%",
        topMeals: ["Butter Chicken", "Buffalo Mac & Cheese", "Chicken Tikka Masala"],
        topSnacks: ["Fresh Fruit Cups", "RXBARs", "Hummus & Pretzel Packs"],
        dietaryNotes: "12% vegetarian options requested"
      }
    },
    {
      id: 3,
      title: "Electrical Preparation",
      status: "in-progress",
      startDate: "Jan 13, 2025",
      endDate: "Jan 24, 2025",
      description: "Property is responsible for electrical preparation. Dedicated 15A circuit required for Smart Cooker™ induction system. We've provided specifications—property team is coordinating contractor quotes and installation.",
      tasks: [
        { label: "Electrical specifications provided to property", completed: true },
        { label: "Property obtained contractor quotes", completed: true },
        { label: "Property selected electrical contractor", completed: true },
        { label: "Dedicated 15A circuit installation", completed: false },
        { label: "Electrical inspection passed", completed: false }
      ],
      propertyResponsibility: true,
      contractorInfo: {
        name: "Select Electric LLC",
        scheduledDate: "Jan 20-22, 2025",
        status: "Scheduled"
      }
    },
    {
      id: 4,
      title: "System Installation & Integration",
      status: "pending",
      startDate: "~Jan 27, 2025",
      endDate: "~Jan 31, 2025",
      isApproximate: true,
      description: "Equipment delivery and installation. Smart Fridge™ units positioned and connected. Smart Cooker™ integrated with dedicated circuit. Payment system activation and cellular connectivity confirmed.",
      tasks: [
        { label: "Equipment delivery to site", completed: false },
        { label: "Smart Fridge™ units positioning", completed: false },
        { label: "Smart Cooker™ installation & circuit connection", completed: false },
        { label: "Custom enclosure installation", completed: false },
        { label: "Payment system activation", completed: false },
        { label: "Cellular transaction testing", completed: false }
      ]
    },
    {
      id: 5,
      title: "Testing, Stocking & Launch",
      status: "pending",
      startDate: "~Feb 3, 2025",
      endDate: "~Feb 7, 2025",
      isApproximate: true,
      description: "Full system testing, initial inventory stocking with Southerleigh chef-prepared meals based on survey results, property management dashboard setup, and tenant launch communications.",
      tasks: [
        { label: "AI vision system calibration", completed: false },
        { label: "Payment processing verification", completed: false },
        { label: "Initial Southerleigh meal inventory (survey-based)", completed: false },
        { label: "Snack inventory based on employee preferences", completed: false },
        { label: "Property management dashboard access", completed: false },
        { label: "Tenant communication materials delivered", completed: false },
        { label: "Official infrastructure launch", completed: false }
      ]
    }
  ],
  equipment: [
    {
      name: "Smart Fridge™ Unit A",
      model: "MicroMart SF-200",
      spec: "60 meal capacity",
      status: "ready",
      statusLabel: "Ready for Delivery"
    },
    {
      name: "Smart Fridge™ Unit B",
      model: "MicroMart SF-200",
      spec: "60 meal capacity",
      status: "ready",
      statusLabel: "Ready for Delivery"
    },
    {
      name: "Smart Cooker™ System",
      model: "KitchenMate SC-3P",
      spec: "3-pod induction heating",
      status: "ready",
      statusLabel: "Ready for Delivery"
    },
    {
      name: "Custom Wood Enclosure",
      model: "FixtureLite",
      spec: "Walnut finish, building-matched",
      status: "fabricating",
      statusLabel: "Fabrication in Progress"
    }
  ]
};

// Icons as components
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const FridgeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <line x1="4" y1="8" x2="20" y2="8"/>
    <line x1="12" y1="14" x2="12" y2="16"/>
  </svg>
);

const CookerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

const EnclosureIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18M9 21V9"/>
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

// Header Component
function Header({ project }) {
  return (
    <header className="widget-header">
      <div className="header-top">
        <div className="logo">
          <span className="logo-text">RAPTOR</span>
          <span className="logo-subtext">VENDING</span>
        </div>
        <div className="project-id">Project #{project.id}</div>
      </div>
      
      <h1 className="location-name">{project.locationName}</h1>
      <p className="location-address">{project.address}</p>
      
      <div className="header-meta">
        <div className="meta-item">
          <span className="meta-label">Building Size</span>
          <span className="meta-value">{project.employeeCount} Employees</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Configuration</span>
          <span className="meta-value">{project.configuration}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Project Manager</span>
          <span className="meta-value">{project.projectManager.name}</span>
        </div>
      </div>
    </header>
  );
}

// Overall Progress Component
function OverallProgress({ progress, estimatedCompletion, daysRemaining }) {
  return (
    <div className="overall-progress">
      <div className="overall-progress-header">
        <span className="overall-progress-label">Overall Installation Progress</span>
        <span className="overall-progress-percent">{progress}%</span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="estimated-completion">
        Estimated completion: <strong>{estimatedCompletion}</strong> ({daysRemaining} days remaining)
      </div>
    </div>
  );
}

// Task Item Component
function TaskItem({ task }) {
  return (
    <div className={`subtask ${task.completed ? 'completed' : ''}`}>
      <div className={`subtask-checkbox ${task.completed ? 'completed' : 'pending'}`}>
        {task.completed && <CheckIcon />}
      </div>
      <span className="subtask-label">{task.label}</span>
    </div>
  );
}

// Survey Results Component
function SurveyResults({ results }) {
  return (
    <div className="survey-results">
      <div className="survey-results-header">
        <ChartIcon />
        <span>Survey Results</span>
        <span className="response-rate">{results.responseRate} response rate</span>
      </div>
      <div className="survey-grid">
        <div className="survey-item">
          <span className="survey-item-label">Top Meal Choices</span>
          <ul>
            {results.topMeals.map((meal, idx) => (
              <li key={idx}>{meal}</li>
            ))}
          </ul>
        </div>
        <div className="survey-item">
          <span className="survey-item-label">Top Snack Choices</span>
          <ul>
            {results.topSnacks.map((snack, idx) => (
              <li key={idx}>{snack}</li>
            ))}
          </ul>
        </div>
      </div>
      {results.dietaryNotes && (
        <div className="dietary-note">{results.dietaryNotes}</div>
      )}
    </div>
  );
}

// Property Responsibility Notice
function PropertyNotice({ contractorInfo }) {
  return (
    <div className="property-notice">
      <div className="notice-header">
        <AlertIcon />
        <span>Property Responsibility</span>
      </div>
      <p>Electrical preparation is managed by your facilities team. We've provided all specifications needed for contractor quotes.</p>
      {contractorInfo && (
        <div className="contractor-info">
          <span className="contractor-label">Selected Contractor:</span>
          <span className="contractor-name">{contractorInfo.name}</span>
          <span className="contractor-date">Scheduled: {contractorInfo.scheduledDate}</span>
        </div>
      )}
    </div>
  );
}

// Timeline Phase Component
function TimelinePhase({ phase, phaseNumber }) {
  const [isExpanded, setIsExpanded] = useState(phase.status === 'in-progress');
  
  const getMarkerContent = () => {
    if (phase.status === 'completed') {
      return <CheckIcon />;
    }
    return phaseNumber;
  };

  return (
    <div className={`timeline-item ${phase.status}`}>
      <div className={`timeline-marker ${phase.status}`}>
        {getMarkerContent()}
      </div>
      <div className="timeline-content">
        <div 
          className="phase-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="phase-title-row">
            <div className="phase-title">{phase.title}</div>
            {phase.isApproximate && (
              <span className="approximate-badge">Approximate</span>
            )}
          </div>
          <span className={`phase-status ${phase.status}`}>
            {phase.status === 'completed' ? 'Completed' : 
             phase.status === 'in-progress' ? 'In Progress' : 'Pending'}
          </span>
        </div>
        
        <div className="phase-dates">
          {phase.isApproximate ? (
            <span className="approximate-dates">{phase.startDate} – {phase.endDate}</span>
          ) : (
            <span>{phase.startDate} – {phase.endDate}</span>
          )}
        </div>
        
        <div className={`phase-details ${isExpanded ? 'expanded' : ''}`}>
          <div className="phase-description">{phase.description}</div>
          
          {phase.propertyResponsibility && (
            <PropertyNotice contractorInfo={phase.contractorInfo} />
          )}
          
          {phase.surveyResults && (
            <SurveyResults results={phase.surveyResults} />
          )}
          
          <div className="subtasks">
            <div className="subtasks-title">
              {phase.status === 'completed' ? 'Completed Tasks' : 
               phase.status === 'in-progress' ? 'Task Progress' : 'Upcoming Tasks'}
            </div>
            {phase.tasks.map((task, idx) => (
              <TaskItem key={idx} task={task} />
            ))}
          </div>
        </div>
        
        <button 
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show Less' : 'Show Details'}
        </button>
      </div>
    </div>
  );
}

// Timeline Component
function Timeline({ phases }) {
  return (
    <div className="timeline-section">
      <h2 className="section-title">Installation Timeline</h2>
      <div className="timeline">
        {phases.map((phase, idx) => (
          <TimelinePhase key={phase.id} phase={phase} phaseNumber={idx + 1} />
        ))}
      </div>
    </div>
  );
}

// Equipment Card Component
function EquipmentCard({ item }) {
  const getIcon = () => {
    if (item.name.includes('Fridge')) return <FridgeIcon />;
    if (item.name.includes('Cooker')) return <CookerIcon />;
    return <EnclosureIcon />;
  };

  const getStatusClass = () => {
    switch (item.status) {
      case 'delivered': return 'delivered';
      case 'ready': return 'ready';
      case 'in-transit': return 'in-transit';
      case 'fabricating': return 'fabricating';
      default: return 'pending';
    }
  };

  return (
    <div className="equipment-card">
      <div className="equipment-icon">
        {getIcon()}
      </div>
      <div className="equipment-name">{item.name}</div>
      <div className="equipment-spec">{item.model} | {item.spec}</div>
      <div className={`equipment-status ${getStatusClass()}`}>
        <span className={`status-dot ${getStatusClass()}`}></span>
        <span>{item.statusLabel}</span>
      </div>
    </div>
  );
}

// Equipment Section Component
function EquipmentSection({ equipment }) {
  return (
    <div className="equipment-section">
      <h2 className="section-title">Equipment Status</h2>
      <div className="equipment-grid">
        {equipment.map((item, idx) => (
          <EquipmentCard key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

// Contact Footer Component
function ContactFooter({ projectManager }) {
  return (
    <footer className="contact-section">
      <div className="contact-info">
        <h3>Questions about your installation?</h3>
        <p>
          Contact your project manager {projectManager.name}:{' '}
          <a href={`mailto:${projectManager.email}`}>{projectManager.email}</a> |{' '}
          <a href={`tel:${projectManager.phone.replace(/[^0-9]/g, '')}`}>{projectManager.phone}</a>
        </p>
      </div>
      <a href="tel:+13854386325" className="contact-btn">
        <PhoneIcon />
        Call Now
      </a>
    </footer>
  );
}

// Main App Component
function App() {
  const project = sampleProject;

  return (
    <div className="app">
      <div className="progress-widget">
        <Header project={project} />
        <OverallProgress 
          progress={project.overallProgress}
          estimatedCompletion={project.estimatedCompletion}
          daysRemaining={project.daysRemaining}
        />
        <Timeline phases={project.phases} />
        <EquipmentSection equipment={project.equipment} />
        <ContactFooter projectManager={project.projectManager} />
      </div>
      
      <div className="powered-by">
        <span>Powered by</span>
        <a href="https://raptor-vending.com" target="_blank" rel="noopener noreferrer">
          Raptor Vending
        </a>
        <span className="tagline">Food Infrastructure for Modern Workplaces</span>
      </div>
    </div>
  );
}

export default App;
