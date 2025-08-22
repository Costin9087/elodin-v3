module.exports = async function (context, req) {
    context.log('Simple test function called');
    
    const response = {
        message: "Hello from Azure Static Web Apps!",
        timestamp: new Date().toISOString(),
        method: req.method,
        success: true
    };
    
    context.res = {
        status: 200,
        body: response,
        headers: {
            "Content-Type": "application/json"
        }
    };
    
    context.log('Response set:', JSON.stringify(response));
};
