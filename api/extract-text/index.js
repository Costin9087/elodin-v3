module.exports = async function (context, req) {
    context.log('Extract-text function called via', req.method);
    
    const response = {
        message: "Extract-text function is working!",
        method: req.method,
        timestamp: new Date().toISOString(),
        status: "ready",
        note: "Function can process image uploads via POST with form data"
    };
    
    context.res = {
        status: 200,
        body: response,
        headers: {
            "Content-Type": "application/json"
        }
    };
    
    context.log('Extract-text response sent:', JSON.stringify(response));
};