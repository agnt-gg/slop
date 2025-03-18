export default {
    // Default server port
    defaultPort: 4000,
    
    // SLOP API endpoints - using standard top-level paths
    endpoints: {
        chat: '/chat',
        tools: '/tools',
        memory: '/memory',
        resources: '/resources',
        pay: '/pay'
    },
    
    // Maximum number of traffic logs to store in memory
    maxTrafficLogs: 500
}; 