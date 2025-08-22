module.exports = async function (context, req) {
    context.log('Health check requested');
    
    const response = {
        status: 'OK',
        message: 'Health check working!',
        timestamp: new Date().toISOString()
    };
    
    context.res = {
        status: 200,
        body: response,
        headers: {
            "Content-Type": "application/json"
        }
    };
    
    context.log('Health response sent');
};