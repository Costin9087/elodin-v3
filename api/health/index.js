"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.health = health;
const functions_1 = require("@azure/functions");
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