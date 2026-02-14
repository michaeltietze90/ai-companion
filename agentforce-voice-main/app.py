#!/usr/bin/env python3
"""
Heroku-ready Flask app for AgentForce Voice Sessions
Simple web interface to start voice agent sessions with one button
"""
import os
import json
import traceback
from collections import deque
from flask import Flask, render_template_string, jsonify, request, redirect
from flask_cors import CORS
import time
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)

# Configuration from environment variables with working defaults
BOOTSTRAP_URL_TEMPLATE = os.getenv("BOOTSTRAP_URL", "https://storm-0eeed5e4b524b9.my.site.com/AFMProtoHologram1758549294447/agentforce/bootstrap?agentid=0XxHo000000h0HyKAI&isPreview=true")
AGENT_ID = os.getenv("AGENT_ID", "0XxHo000000h0HyKAI")
DOMAIN_URL = os.getenv("DOMAIN_URL", "https://storm-0eeed5e4b524b9.my.salesforce.com")
SALESFORCE_ENDPOINT = os.getenv("SALESFORCE_ENDPOINT", "https://api.salesforce.com")

# In-memory command queues per deviceId for remote control
COMMAND_QUEUES = {}

# HTML template for the full-featured page (legacy)
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agentforce Voice Assistant</title>
    <script src="https://cdn.jsdelivr.net/npm/livekit-client@latest/dist/livekit-client.umd.min.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --sf-blue-primary: #0176d3;
            --sf-blue-secondary: #014486;
            --sf-blue-light: #1589ee;
            --sf-orange: #ff6000;
            --sf-green: #04844b;
            --sf-purple: #5867dd;
            --sf-gray-light: #f3f3f3;
            --sf-gray-medium: #dddbda;
            --sf-gray-dark: #706e6b;
            --sf-white: #ffffff;
            --sf-text-primary: #080707;
            --sf-text-secondary: #3e3e3c;
            --sf-success: #45c65a;
            --sf-warning: #ffb75d;
            --sf-error: #ea001e;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Salesforce Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: 
                linear-gradient(180deg, 
                    rgba(186, 1, 255, 0.9) 0%,
                    rgba(31, 9, 116, 0.8) 30%,
                    rgba(1, 118, 211, 0.9) 70%,
                    rgba(1, 68, 134, 1) 100%
                );
            min-height: 100vh;
            color: var(--sf-text-primary);
            padding: 20px;
            position: relative;
            overflow-x: hidden;
        }
        
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjE1MiIgdmlld0JveD0iMCAwIDI1NiAxNTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB4PSIwLjMzMzk4NCIgeT0iLTAuMDU0Njg3NSIgd2lkdGg9IjMxOS42MTIiIGhlaWdodD0iMTc5LjM1OSIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzMyNThfNDMzMjQpIi8+CiAgICA8ZGVmcz4KICAgICAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfMzI1OF80MzMyNCIgeDE9IjE2MC4xNCIgeTE9Ii0wLjA1NDY4NzUiIHgyPSIxNjAuMTQiIHkyPSIxNzkuMzA1IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiNCQTAxRkYiLz4KICAgICAgICAgICAgPHN0b3Agb2Zmc2V0PSIwLjkiIHN0b3AtY29sb3I9IiMxRjA5NzQiLz4KICAgICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgo8L3N2Zz4K');
            background-size: cover;
            background-position: center top;
            background-repeat: no-repeat;
            opacity: 0.3;
            z-index: -3;
        }
        
        body::after {
            content: '';
            position: fixed;
            bottom: 0;
            right: 0;
            width: 300px;
            height: 300px;
            background-image: url('Artboard 1@5x.png');
            background-size: contain;
            background-position: bottom right;
            background-repeat: no-repeat;
            opacity: 0.4;
            z-index: -2;
        }
        
        .app-header {
            text-align: center;
            margin-bottom: 30px;
            color: white;
            position: relative;
            z-index: 1;
        }
        
        .agentforce-logo {
            width: 300px;
            height: auto;
            margin-bottom: 20px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        
        .app-header h1 {
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            background: linear-gradient(45deg, #ffffff, #e0f0ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .app-header .subtitle {
            font-size: 1.2em;
            opacity: 0.95;
            font-weight: 300;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        
        .main-container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            align-items: start;
        }
        
        .left-panel, .right-panel {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            position: relative;
            z-index: 1;
        }
        
        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--sf-gray-light);
        }
        
        .panel-header h2 {
            color: var(--sf-blue-primary);
            font-size: 1.5em;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .config-section {
            margin-bottom: 25px;
        }
        
        
        .saved-configs {
            margin-bottom: 20px;
        }
        
        .saved-config-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 15px;
            background: var(--sf-gray-light);
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .saved-config-item:hover {
            background: var(--sf-blue-light);
            color: white;
        }
        
        .saved-config-item.active {
            background: var(--sf-blue-primary);
            color: white;
        }
        
        .config-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn-icon {
            background: none;
            border: none;
            padding: 5px;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        
        .btn-icon:hover {
            background: rgba(255,255,255,0.2);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--sf-text-secondary);
        }
        
        .form-group input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid var(--sf-gray-medium);
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
            background: white;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: var(--sf-blue-primary);
            box-shadow: 0 0 0 3px rgba(1, 118, 211, 0.1);
        }
        
        .save-config-section {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .save-config-section input {
            flex: 1;
        }
        
        .btn-primary {
            background: var(--sf-blue-primary);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 15px 30px;
            font-size: 1.1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-height: 50px;
        }
        
        .btn-primary:hover {
            background: var(--sf-blue-light);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(1, 118, 211, 0.3);
        }
        
        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .btn-secondary {
            background: var(--sf-gray-light);
            color: var(--sf-text-primary);
            border: 2px solid var(--sf-gray-medium);
            border-radius: 8px;
            padding: 12px 25px;
            font-size: 1em;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-secondary:hover {
            background: var(--sf-gray-medium);
        }
        
        .btn-danger {
            background: var(--sf-error);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 25px;
            font-size: 1em;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-danger:hover {
            background: #c7001a;
        }
        
        .control-buttons {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .mic-controls {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-top: 15px;
        }
        
        .mic-button {
            background: var(--sf-success);
            color: white;
            border: none;
            border-radius: 50px;
            width: 60px;
            height: 60px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;
        }
        
        .mic-button.muted {
            background: var(--sf-error);
        }
        
        .mic-button:hover {
            transform: scale(1.1);
        }
        
        .status-panel {
            background: var(--sf-gray-light);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .status-panel.connecting {
            background: var(--sf-warning);
            color: white;
            animation: pulse 2s infinite;
        }
        
        .status-panel.connected {
            background: var(--sf-success);
            color: white;
        }
        
        .status-panel.error {
            background: var(--sf-error);
            color: white;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.8; }
            100% { opacity: 1; }
        }
        
        .audio-container {
            background: var(--sf-gray-light);
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            display: none;
        }
        
        .audio-container.show {
            display: block;
        }
        
        .audio-container h3 {
            color: var(--sf-blue-primary);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        audio {
            width: 100%;
            margin: 10px 0;
            border-radius: 8px;
        }
        
        .session-info {
            background: var(--sf-gray-light);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 0.9em;
        }
        
        .session-info strong {
            color: var(--sf-blue-primary);
        }
        
        .error-details {
            background: rgba(234, 0, 30, 0.1);
            border: 1px solid var(--sf-error);
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
            font-size: 0.9em;
            max-height: 200px;
            overflow-y: auto;
        }
        
        @media (max-width: 768px) {
            .main-container {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .app-header h1 {
                font-size: 2.2em;
            }
            
            .control-buttons {
                flex-direction: column;
                align-items: stretch;
            }
        }
    </style>
</head>
<body>
    <div class="app-header">
        <svg class="agentforce-logo" viewBox="0 0 296 59" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M31.9317 43.8298L27.8046 33.8302H13.1388L9.01177 43.8298C8.86438 44.1897 8.51431 44.4204 8.1274 44.4204H1.84008C1.15838 44.4204 0.69777 43.7282 0.960317 43.0961L17.2106 3.97918C17.358 3.62386 17.7081 3.38853 18.0904 3.38853H22.7379C23.1248 3.38853 23.4703 3.61925 23.6223 3.97918L39.9785 43.0961C40.2411 43.7282 39.7805 44.4204 39.0988 44.4204H32.8161C32.4292 44.4204 32.0791 44.1851 31.9317 43.8298ZM20.4441 14.0895H20.3336L15.686 26.6778H25.0963L20.4487 14.0895H20.4441ZM64.8929 40.4843C62.4563 43.9774 58.9695 45.4171 54.8194 45.4171C46.9061 45.4171 39.0988 38.4862 39.0988 28.7266C39.0988 20.0191 46.1277 12.5898 54.7641 12.5898C58.7484 12.5898 62.3457 14.0849 64.5613 17.4119H64.6718V14.5971C64.6718 14.0664 65.1002 13.6419 65.6253 13.6419H70.8532C71.3829 13.6419 71.8067 14.071 71.8067 14.5971V39.3122C71.8067 50.4561 64.0592 56.9441 55.0359 56.9441C48.5367 56.9441 42.6823 53.414 40.0108 47.7151C39.7989 47.2629 40.1305 46.7415 40.628 46.7415H47.3391C47.7398 46.7415 48.1313 46.8984 48.4031 47.1891C50.3699 49.3025 52.6868 50.1793 55.5886 50.1793C60.6783 50.1793 64.6119 46.4092 64.9988 40.5858L64.8883 40.475L64.8929 40.4843ZM64.4507 28.7312C64.4507 23.9091 60.4665 19.3592 55.3721 19.3592C49.8724 19.3592 45.317 24.7074 46.7173 31.1123C47.574 35.0161 50.6555 38.1263 54.6167 38.5923C60.3006 39.2614 64.4461 34.3424 64.4461 28.7266L64.4507 28.7312ZM82.9166 32.3351C83.4693 35.053 86.8456 38.6569 91.3872 38.6569C94.2614 38.6569 96.6934 37.5679 98.2134 35.1592C98.3884 34.8777 98.7063 34.7208 99.0379 34.7208H105.247C105.726 34.7208 106.062 35.2099 105.883 35.6529C103.584 41.3749 97.587 45.4217 91.3872 45.4217C82.1427 45.4217 75.1691 38.2139 75.1691 29.1188C75.1691 20.0237 81.9769 12.5944 91.3319 12.5944C100.687 12.5944 107.218 19.6361 107.218 28.6205C107.218 29.548 107.112 30.5124 106.928 31.5368C106.845 31.9936 106.449 32.3351 105.984 32.3351H82.9166ZM99.6873 26.4009C98.9688 21.9664 95.9242 19.3592 91.3273 19.3592C87.2877 19.3592 83.8562 21.6895 82.6955 26.4009H99.6873ZM270.813 32.3351C271.366 35.053 274.742 38.6569 279.284 38.6569C282.158 38.6569 284.59 37.5679 286.11 35.1592C286.285 34.8777 286.603 34.7208 286.934 34.7208H293.143C293.622 34.7208 293.959 35.2099 293.779 35.6529C291.481 41.3749 285.483 45.4217 279.284 45.4217C270.039 45.4217 263.066 38.2139 263.066 29.1188C263.066 20.0237 269.873 12.5944 279.228 12.5944C288.583 12.5944 295.115 19.6361 295.115 28.6205C295.115 29.548 295.009 30.5124 294.825 31.5368C294.742 31.9936 294.346 32.3351 293.88 32.3351H270.813ZM287.584 26.4009C286.865 21.9664 283.821 19.3592 279.224 19.3592C275.184 19.3592 271.753 21.6895 270.592 26.4009H287.584ZM131.331 44.4204C130.802 44.4204 130.378 43.9913 130.378 43.4652V28.9527C130.378 22.6862 128.328 19.3592 124.178 19.3592C121.907 19.3592 117.812 20.8543 117.812 27.6191V43.4652C117.812 43.9959 117.384 44.4204 116.859 44.4204H111.41C110.88 44.4204 110.456 43.9913 110.456 43.4652V14.6063C110.456 14.0756 110.885 13.6511 111.41 13.6511H116.306C116.836 13.6511 117.26 14.0803 117.26 14.6063V16.309C119.696 13.9234 122.184 12.5944 125.726 12.5944C129.71 12.5944 137.738 15.0908 137.738 26.2348V43.4652C137.738 43.9959 137.31 44.4204 136.785 44.4204H131.336H131.331ZM178.18 29.0634C178.18 20.1898 185.319 12.5944 194.564 12.5944C203.808 12.5944 210.837 20.0791 210.837 28.9527C210.837 37.8263 203.974 45.4217 194.564 45.4217C185.153 45.4217 178.18 37.9371 178.18 29.0634ZM203.472 29.1188C203.472 24.0752 199.709 19.3592 194.504 19.3592C189.58 19.3592 185.536 23.9045 185.536 29.0634C185.536 34.2224 189.299 38.6569 194.559 38.6569C199.819 38.6569 203.472 34.2224 203.472 29.1188ZM259.662 34.3839C260.353 34.3839 260.822 35.0992 260.537 35.7267C257.727 41.9332 252.269 45.4171 245.701 45.4171C236.622 45.4171 229.372 37.9325 229.372 28.8927C229.372 19.853 236.622 12.5898 245.645 12.5898C252.117 12.5898 257.907 16.226 260.578 22.5017C260.85 23.1385 260.399 23.8445 259.708 23.8445H253.37C253.024 23.8445 252.697 23.6737 252.518 23.3738C250.942 20.7851 248.837 19.35 245.65 19.35C240.445 19.35 236.737 23.5076 236.737 28.9988C236.737 34.4901 240.721 38.6477 245.982 38.6477C248.837 38.6477 250.965 37.0834 252.495 34.8315C252.683 34.5547 252.992 34.3793 253.328 34.3793H259.666L259.662 34.3839ZM154.131 58.716C153.201 58.716 152.275 58.693 151.151 58.4299C150.336 58.2361 149.894 58.0977 149.313 57.89C148.807 57.7101 148.429 57.1056 148.678 56.4042C148.807 56.0396 149.963 52.851 150.129 52.4219C150.387 51.762 151.05 51.6051 151.543 51.7943C152.095 52.0251 152.349 52.1358 153.639 52.265C154.56 52.2973 155.389 52.1958 156.071 51.9697C156.738 51.7436 157.135 51.3606 157.591 50.7745C158.028 50.2162 158.42 49.4087 158.862 48.1581C159.286 46.9676 159.668 45.3802 160.004 43.4421L164.251 19.6868H160.608C160.188 19.6868 159.871 19.5669 159.659 19.3223C159.521 19.1654 159.369 18.8839 159.428 18.4271L160.156 14.3479C160.317 13.5081 161.027 13.3327 161.372 13.3235H165.31L165.467 12.4606C166.144 8.43676 167.512 5.36352 169.53 3.32392C171.588 1.24741 174.495 0.195312 178.166 0.195312C179.202 0.195312 180.124 0.269144 180.911 0.407578C181.74 0.559856 182.298 0.693675 182.901 0.882869C182.915 0.882869 182.929 0.892098 182.938 0.896712C183.546 1.13666 183.822 1.6904 183.615 2.27644L182.123 6.3787C181.92 6.87707 181.588 7.32467 180.598 7.02012C180.483 6.9832 180.271 6.9186 179.649 6.78939C179.207 6.69249 178.668 6.64173 178.166 6.64173C177.452 6.64173 176.807 6.73402 176.245 6.91398C175.725 7.0801 175.25 7.38004 174.836 7.79535C174.242 8.39523 173.822 9.0228 173.601 9.66421C173.242 10.7025 172.943 11.9299 172.703 13.3281H178.281C178.696 13.3281 179.018 13.4481 179.23 13.6926C179.368 13.8495 179.52 14.131 179.46 14.5832L178.733 18.6624C178.571 19.5023 177.876 19.6961 177.517 19.6868H171.588L167.286 44.0882C166.821 46.6907 166.236 48.9287 165.55 50.7422C164.794 52.7265 164.03 54.0416 162.915 55.2783C161.777 56.538 160.492 57.4378 159.097 57.9408C157.697 58.4484 155.978 58.716 154.131 58.716ZM151.663 13.6465V4.34372C151.663 3.81306 151.234 3.38853 150.709 3.38853H145.255C144.73 3.38853 144.302 3.81767 144.302 4.34372V13.6465H140.829C140.299 13.6465 139.876 14.0756 139.876 14.6017V19.3546C139.876 19.816 140.249 20.1852 140.705 20.1852H144.302V43.4606C144.302 43.9913 144.73 44.4158 145.255 44.4158H150.704C151.234 44.4158 151.658 43.9866 151.658 43.4606V20.1852H155.131C155.661 20.1852 156.084 19.7561 156.084 19.23V14.6017C156.084 14.071 155.656 13.6465 155.131 13.6465H151.658H151.663ZM227.216 12.599C227.216 12.599 227.166 12.599 227.133 12.599C227.078 12.599 227.009 12.599 226.931 12.6036C223.757 12.6821 222.205 13.6142 220.353 16.3644H220.243V14.6063C220.243 14.0756 219.814 13.6511 219.289 13.6511H214.448C213.919 13.6511 213.495 14.0803 213.495 14.6063V43.4652C213.495 43.9959 213.923 44.4204 214.448 44.4204H219.897C220.427 44.4204 220.851 43.9913 220.851 43.4652V26.8993C220.851 22.4648 222.956 20.0929 227.069 19.7745C227.336 19.7561 227.548 19.5346 227.548 19.2669V13.0558C227.557 12.8482 227.465 12.6498 227.216 12.6036V12.599Z" fill="url(#paint0_linear_3258_43327)"/>
            <defs>
                <linearGradient id="paint0_linear_3258_43327" x1="-33.2188" y1="29.4603" x2="320.492" y2="29.4603" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#7CB1FE"/>
                    <stop offset="0.51" stop-color="#D6E6FF"/>
                    <stop offset="1" stop-color="#7CB1FE"/>
                </linearGradient>
            </defs>
        </svg>
        <p class="subtitle">Connect and collaborate with your AI agent</p>
    </div>
    
    <div class="main-container">
        <!-- Left Panel: Configuration -->
        <div class="left-panel">
            <div class="panel-header">
                <h2><i class="fas fa-cogs"></i> Configuration</h2>
            </div>
            
            <!-- Saved Configurations -->
            <div class="config-section">
                <h3 style="margin-bottom: 15px; color: var(--sf-text-secondary);">Saved Configurations</h3>
                
                <div id="savedConfigs" class="saved-configs">
                    <!-- Saved configs will appear here -->
                </div>
            </div>
            
            <!-- Configuration Form -->
            <div class="config-section">
                <div class="form-group">
                    <label for="bootstrapUrl">Bootstrap URL Template:</label>
                    <input type="url" id="bootstrapUrl" placeholder="https://your-org.sandbox.my.salesforce.com/services/data/v61.0/einstein/ai-agent/v1.1/agents/{AGENT_ID}/bootstrap">
                </div>
                
                <div class="form-group">
                    <label for="agentId">Agent ID:</label>
                    <input type="text" id="agentId" placeholder="0XxYourAgentIdHere">
                </div>
                
                <div class="form-group">
                    <label for="domainUrl">Domain URL:</label>
                    <input type="url" id="domainUrl" placeholder="https://your-org.sandbox.my.salesforce.com">
                </div>
                
                <div class="form-group">
                    <label for="salesforceEndpoint">Salesforce Endpoint:</label>
                    <input type="url" id="salesforceEndpoint" placeholder="https://your-org.sandbox.my.salesforce.com">
                </div>
                
                <div class="save-config-section">
                    <input type="text" id="configName" placeholder="Configuration name (e.g., 'My Sandbox')">
                    <button class="btn-secondary" onclick="saveCurrentConfig()">
                        <i class="fas fa-save"></i> Save
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Right Panel: Voice Session -->
        <div class="right-panel">
            <div class="panel-header"><h2><i class="fas fa-microphone"></i> Voice Session</h2></div>
            
            <!-- Session Info -->
            <div id="sessionInfo" class="session-info" style="display: none;">
                <strong>Session ID:</strong> <span id="sessionIdDisplay">-</span><br>
                <strong>User:</strong> <span id="userIdDisplay">User-{{ user_id }}</span>
            </div>

            <!-- Device Binding Info -->
            <div class="session-info">
                <strong>Device ID:</strong> <span id="deviceIdDisplay">-</span>
            </div>
            
            <!-- Status Panel -->
            <div id="status" class="status-panel">
                <i class="fas fa-info-circle"></i> Ready to connect - Configure settings first
            </div>
            
            <!-- Control Buttons -->
            <div class="control-buttons">
                <button id="connectBtn" class="btn-primary" onclick="startVoiceSession()">
                    <i class="fas fa-play"></i> Start Voice Session
                </button>
                
                <button id="disconnectBtn" class="btn-danger" onclick="disconnectSession()" style="display: none;">
                    <i class="fas fa-stop"></i> Disconnect
                </button>
                
                <a id="openControlBtn" class="btn-secondary" href="#" target="_blank">
                    <i class="fas fa-sliders"></i> Open Control Panel
                </a>
            </div>
            
            <!-- Microphone Controls -->
            <div class="mic-controls" style="display: none;" id="micControls">
                <button id="micButton" class="mic-button" onclick="toggleMicrophone()">
                    <i class="fas fa-microphone"></i>
                </button>
                <span id="micStatus">Microphone active</span>
            </div>
            
            <!-- Audio Container -->
            <div id="audioContainer" class="audio-container">
                <h3><i class="fas fa-volume-up"></i> Agent Audio</h3>
                <p>Agent voice will appear here when connected</p>
            </div>
        </div>
    </div>

    <script>
        let room = null;
        let isConnecting = false;
        let isMuted = false;
        let localMicTrack = null;
        let currentUserId = 'user-' + Math.random().toString(36).substr(2, 9);
        
        // Load saved settings on page load
        window.addEventListener('load', () => {
            loadSettings();
            loadSavedConfigs();
            updateStatusMessage();
            displayUserId();
            // Control panel link
            const cp = document.getElementById('openControlBtn');
            const u = new URL(window.location.href);
            const base = `${u.origin}/control?deviceId=${encodeURIComponent(deviceId)}`;
            cp.href = base;
            // Do not auto-connect by default; user can press Start
        });
        
        function displayUserId() {
            document.getElementById('userIdDisplay').textContent = currentUserId;
        }
        
        function loadSettings() {
            // Always load with working defaults - override any existing localStorage
            document.getElementById('bootstrapUrl').value = 'https://storm-0eeed5e4b524b9.my.site.com/AFMProtoHologram1758549294447/agentforce/bootstrap?agentid=0XxHo000000h0HyKAI&isPreview=true';
            document.getElementById('agentId').value = '0XxHo000000h0HyKAI';
            document.getElementById('domainUrl').value = 'https://storm-0eeed5e4b524b9.my.salesforce.com';
            document.getElementById('salesforceEndpoint').value = 'https://api.salesforce.com';
            
            // Save these as the current settings
            saveSettings();
        }
        
        function saveSettings() {
            // Save current configuration
            localStorage.setItem('current_bootstrapUrl', document.getElementById('bootstrapUrl').value);
            localStorage.setItem('current_agentId', document.getElementById('agentId').value);
            localStorage.setItem('current_domainUrl', document.getElementById('domainUrl').value);
            localStorage.setItem('current_salesforceEndpoint', document.getElementById('salesforceEndpoint').value);
        }
        
        function loadSavedConfigs() {
            let savedConfigs = JSON.parse(localStorage.getItem('savedConfigs') || '[]');
            
            // Always ensure standard configurations have latest working values
            const standardConfigs = [
                {
                    name: 'ProtoTest',
                    bootstrapUrl: 'https://storm-0eeed5e4b524b9.my.site.com/AFMProtoHologram1758549294447/agentforce/bootstrap?agentid=0XxHo000000h0HyKAI&isPreview=true',
                    agentId: '0XxHo000000h0HyKAI',
                    domainUrl: 'https://storm-0eeed5e4b524b9.my.salesforce.com',
                    salesforceEndpoint: 'https://api.salesforce.com',
                    savedAt: new Date().toISOString()
                },
                {
                    name: 'Production',
                    bootstrapUrl: 'https://your-prod-org.my.salesforce.com/services/data/v60.0/agentforce/bootstrap?agentid=YOUR_PROD_AGENT_ID',
                    agentId: 'YOUR_PROD_AGENT_ID',
                    domainUrl: 'https://your-prod-org.my.salesforce.com',
                    salesforceEndpoint: 'https://api.salesforce.com',
                    savedAt: new Date().toISOString()
                }
            ];
            
            // Update or add standard configurations
            standardConfigs.forEach(standardConfig => {
                const existingIndex = savedConfigs.findIndex(config => config.name === standardConfig.name);
                if (existingIndex >= 0) {
                    // Update existing standard config with latest values
                    savedConfigs[existingIndex] = standardConfig;
                } else {
                    // Add new standard config at the beginning
                    savedConfigs.unshift(standardConfig);
                }
            });
            localStorage.setItem('savedConfigs', JSON.stringify(savedConfigs));
            
            const container = document.getElementById('savedConfigs');
            container.innerHTML = '';
            
            savedConfigs.forEach((config, index) => {
                const configItem = document.createElement('div');
                configItem.className = 'saved-config-item';
                
                // Don't show delete button for ProtoTest
                const deleteButton = config.name === 'ProtoTest' ? '' : `
                    <button class="btn-icon" onclick="deleteSavedConfig(${index})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                
                configItem.innerHTML = `
                    <div onclick="loadSavedConfig(${index})">
                        <strong>${config.name}</strong>
                        <div style="font-size: 0.9em; opacity: 0.7;">${config.domainUrl}</div>
                    </div>
                    <div class="config-actions">
                        ${deleteButton}
                    </div>
                `;
                container.appendChild(configItem);
            });
        }
        
        function saveCurrentConfig() {
            const name = document.getElementById('configName').value.trim();
            if (!name) {
                alert('Please enter a configuration name');
                return;
            }
            
            const settings = validateSettings();
            if (!settings) {
                alert('Please fill in all configuration fields first');
                return;
            }
            
            const savedConfigs = JSON.parse(localStorage.getItem('savedConfigs') || '[]');
            const newConfig = {
                name: name,
                ...settings,
                savedAt: new Date().toISOString()
            };
            
            // Check if config with same name exists
            const existingIndex = savedConfigs.findIndex(config => config.name === name);
            if (existingIndex >= 0) {
                if (confirm(`Configuration "${name}" already exists. Replace it?`)) {
                    savedConfigs[existingIndex] = newConfig;
                } else {
                    return;
                }
            } else {
                savedConfigs.push(newConfig);
            }
            
            localStorage.setItem('savedConfigs', JSON.stringify(savedConfigs));
            document.getElementById('configName').value = '';
            loadSavedConfigs();
            
            // Show success message
            const status = document.getElementById('status');
            const originalContent = status.innerHTML;
            status.innerHTML = '<i class="fas fa-check"></i> Configuration saved successfully!';
            status.className = 'status-panel connected';
            setTimeout(() => {
                status.innerHTML = originalContent;
                updateStatusMessage();
            }, 2000);
        }
        
        function loadSavedConfig(index) {
            const savedConfigs = JSON.parse(localStorage.getItem('savedConfigs') || '[]');
            const config = savedConfigs[index];
            if (!config) return;
            
            document.getElementById('bootstrapUrl').value = config.bootstrapUrl;
            document.getElementById('agentId').value = config.agentId;
            document.getElementById('domainUrl').value = config.domainUrl;
            document.getElementById('salesforceEndpoint').value = config.salesforceEndpoint;
            
            saveSettings();
            updateStatusMessage();
            
            // Highlight selected config
            document.querySelectorAll('.saved-config-item').forEach((item, i) => {
                item.classList.toggle('active', i === index);
            });
        }
        
        function deleteSavedConfig(index) {
            const savedConfigs = JSON.parse(localStorage.getItem('savedConfigs') || '[]');
            const config = savedConfigs[index];
            
            // Prevent deletion of standard configurations
            const standardConfigs = ['ProtoTest', 'Production'];
            if (standardConfigs.includes(config.name)) {
                alert(`${config.name} configuration cannot be deleted. It is a required standard configuration.`);
                return;
            }
            
            if (confirm(`Delete configuration "${config.name}"?`)) {
                savedConfigs.splice(index, 1);
                localStorage.setItem('savedConfigs', JSON.stringify(savedConfigs));
                loadSavedConfigs();
            }
        }
        
        
        function validateSettings() {
            const bootstrapUrl = document.getElementById('bootstrapUrl').value.trim();
            const agentId = document.getElementById('agentId').value.trim();
            const domainUrl = document.getElementById('domainUrl').value.trim();
            const salesforceEndpoint = document.getElementById('salesforceEndpoint').value.trim();
            
            if (!bootstrapUrl || !agentId || !domainUrl || !salesforceEndpoint) {
                return false;
            }
            
            return { bootstrapUrl, agentId, domainUrl, salesforceEndpoint, userId: currentUserId };
        }
        
        function updateStatusMessage() {
            const settings = validateSettings();
            if (!settings) {
                updateStatus('<i class="fas fa-info-circle"></i> Update the default configuration with your details', '');
            } else {
                updateStatus('<i class="fas fa-check-circle"></i> Ready to connect', '');
            }
        }
        
        // Auto-save settings when inputs change
        document.addEventListener('input', (e) => {
            if (e.target.type === 'url' || e.target.type === 'text') {
                if (e.target.id !== 'configName') {
                    saveSettings();
                    updateStatusMessage();
                }
            }
        });
        
        async function startVoiceSession() {
            if (isConnecting) return;
            // If remote "restart_flow" pushes us here when already connected, disconnect first
            if (room) {
                await disconnectSession();
            }
            
            const settings = validateSettings();
            if (!settings) {
                updateStatus('<i class="fas fa-exclamation-triangle"></i> Please configure all settings first', 'error');
                return;
            }
            
            isConnecting = true;
            updateStatus('<i class="fas fa-spinner fa-spin"></i> Connecting to Agentforce...', 'connecting');
            updateButtons(true);
            
            try {
                // Call our Flask backend to get session credentials
                const response = await fetch('/api/start-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Display session info
                document.getElementById('sessionIdDisplay').textContent = data.sessionId;
                document.getElementById('sessionInfo').style.display = 'block';
                
                // Connect to LiveKit room
                await connectToLiveKit(data.livekitUrl, data.token, data.sessionId);
                
            } catch (error) {
                console.error('Failed to start session:', error);
                updateStatus(`<i class="fas fa-exclamation-circle"></i> Connection failed: ${error.message}`, 'error');
                showErrorDetails(error);
                updateButtons(false);
                isConnecting = false;
            }
        }
        
        async function connectToLiveKit(url, token, sessionId) {
            try {
                const { Room, RoomEvent, createLocalAudioTrack } = LivekitClient;
                room = new Room({ 
                    adaptiveStream: true, 
                    dynacast: true,
                    publishDefaults: {
                        audioPreset: {
                            maxBitrate: 64000,
                        }
                    }
                });
                
                // Set up event listeners
                room.on(RoomEvent.Connected, async () => {
                    updateStatus('<i class="fas fa-check-circle"></i> Connected to Agentforce!', 'connected');
                    
                    try {
                        // Publish microphone
                        localMicTrack = await createLocalAudioTrack();
                        await room.localParticipant.publishTrack(localMicTrack);
                        
                        updateStatus('<i class="fas fa-microphone"></i> Connected - Microphone active!', 'connected');
                        
                        // Show microphone controls
                        document.getElementById('micControls').style.display = 'flex';
                        
                    } catch (micError) {
                        console.error('Microphone error:', micError);
                        updateStatus('<i class="fas fa-exclamation-triangle"></i> Connected (microphone access denied)', 'connected');
                    }
                    
                    isConnecting = false;
                });
                
                room.on(RoomEvent.Disconnected, () => {
                    updateStatus('<i class="fas fa-times-circle"></i> Disconnected from Agentforce', '');
                    updateButtons(false);
                    hideAudioContainer();
                    hideMicControls();
                    hideSessionInfo();
                    room = null;
                    localMicTrack = null;
                    isConnecting = false;
                });
                
                room.on(RoomEvent.ParticipantConnected, (participant) => {
                    console.log('Agent connected:', participant.identity);
                    updateStatus('<i class="fas fa-robot"></i> Agent connected - Ready to chat!', 'connected');
                });
                
                room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                    if (publication.kind === 'audio' && track.mediaStreamTrack) {
                        console.log('Receiving agent audio');
                        
                        // Create audio element for agent voice
                        const audio = document.createElement('audio');
                        audio.autoplay = true;
                        audio.controls = true;
                        audio.srcObject = new MediaStream([track.mediaStreamTrack]);
                        audio.style.width = '100%';
                        audio.style.marginTop = '10px';
                        
                        // Add to audio container
                        const container = document.getElementById('audioContainer');
                        const existingAudio = container.querySelector('audio');
                        if (existingAudio) {
                            existingAudio.remove();
                        }
                        container.appendChild(audio);
                        showAudioContainer();
                        
                        updateStatus('<i class="fas fa-volume-up"></i> Agent is speaking...', 'connected');
                    }
                });
                
                room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                    if (publication.kind === 'audio') {
                        console.log('Agent audio ended');
                        updateStatus('<i class="fas fa-microphone"></i> Listening for your voice...', 'connected');
                    }
                });
                
                // Connect to the room
                await room.connect(url, token);
                
            } catch (error) {
                console.error('LiveKit connection failed:', error);
                throw new Error(`LiveKit connection failed: ${error.message}`);
            }
        }
        
        async function toggleMicrophone() {
            if (!localMicTrack || !room) return;
            
            const micButton = document.getElementById('micButton');
            const micStatus = document.getElementById('micStatus');
            
            if (isMuted) {
                // Unmute
                await localMicTrack.unmute();
                isMuted = false;
                micButton.classList.remove('muted');
                micButton.innerHTML = '<i class="fas fa-microphone"></i>';
                micStatus.textContent = 'Microphone active';
                updateStatus('<i class="fas fa-microphone"></i> Microphone unmuted - You can speak now', 'connected');
            } else {
                // Mute
                await localMicTrack.mute();
                isMuted = true;
                micButton.classList.add('muted');
                micButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                micStatus.textContent = 'Microphone muted';
                updateStatus('<i class="fas fa-microphone-slash"></i> Microphone muted', 'connected');
            }
        }
        
        async function disconnectSession() {
            if (room) {
                await room.disconnect();
                room = null;
            }
            localMicTrack = null;
            isMuted = false;
            updateStatus('<i class="fas fa-info-circle"></i> Disconnected', '');
            updateButtons(false);
            hideAudioContainer();
            hideMicControls();
            hideSessionInfo();
            clearErrorDetails();
        }
        
        function updateStatus(message, type) {
            const status = document.getElementById('status');
            status.innerHTML = message;
            status.className = `status-panel ${type}`;
        }

        // Remote control long-polling (near real-time)
        // Determine deviceId: URL param > localStorage > default
        function getQueryParam(name){
            const url = new URL(window.location.href);
            return url.searchParams.get(name);
        }
        let deviceId = getQueryParam('deviceId') || localStorage.getItem('deviceId') || 'default-phone';
        localStorage.setItem('deviceId', deviceId);
        document.getElementById('deviceIdDisplay').textContent = deviceId;
        async function pollControl(){
            try {
                const res = await fetch('/api/control/poll', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ deviceId, wait: true, timeout: 25 }) });
                if (!res.ok) throw new Error('poll failed');
                const data = await res.json();
                for (const msg of (data.commands || [])){
                    const cmd = typeof msg === 'string' ? msg : (msg.type || '');
                    const payload = typeof msg === 'object' ? (msg.payload || {}) : {};
                    if (cmd === 'end') { await disconnectSession(); }
                    if (cmd === 'new') { await disconnectSession(); await startVoiceSession(); }
                    if (cmd === 'creds') { await startVoiceSession(); }
                    if (cmd === 'join') { await startVoiceSession(); }
                    if (cmd === 'restart_flow') { await disconnectSession(); await startVoiceSession(); }
                    if (cmd === 'mute_mic' || cmd === 'mute') { if (!isMuted && localMicTrack) { await toggleMicrophone(); } }
                    if (cmd === 'unmute_mic' || cmd === 'unmute') { if (isMuted && localMicTrack) { await toggleMicrophone(); } }
                    if (cmd === 'mute_speaker') { setSpeakerMuted(true); }
                    if (cmd === 'unmute_speaker') { setSpeakerMuted(false); }
                    if (cmd === 'set_settings') { applyRemoteSettings(payload); }
                }
            } catch (e) { /* ignore */ }
            // Immediately poll again for near real-time
            pollControl();
        }
        // Kick off the long-poll loop
        setTimeout(pollControl, 100);
        
        function updateButtons(connecting) {
            const connectBtn = document.getElementById('connectBtn');
            const disconnectBtn = document.getElementById('disconnectBtn');
            
            if (connecting || room) {
                connectBtn.style.display = 'none';
                disconnectBtn.style.display = 'inline-flex';
                connectBtn.disabled = true;
            } else {
                connectBtn.style.display = 'inline-flex';
                disconnectBtn.style.display = 'none';
                connectBtn.disabled = false;
            }
        }
        
        function showAudioContainer() {
            document.getElementById('audioContainer').classList.add('show');
        }
        
        function hideAudioContainer() {
            const container = document.getElementById('audioContainer');
            container.classList.remove('show');
            const audio = container.querySelector('audio');
            if (audio) audio.remove();
        }

        // Speaker mute control
        let speakerMuted = false;
        function setSpeakerMuted(m) {
            speakerMuted = !!m;
            const audio = document.querySelector('#audioContainer audio');
            if (audio) audio.muted = speakerMuted;
            updateStatus(speakerMuted ? '<i class="fas fa-volume-xmark"></i> Speaker muted' : '<i class="fas fa-volume-up"></i> Speaker active', 'connected');
        }
        
        function hideMicControls() {
            document.getElementById('micControls').style.display = 'none';
            // Reset mic button state
            const micButton = document.getElementById('micButton');
            const micStatus = document.getElementById('micStatus');
            micButton.classList.remove('muted');
            micButton.innerHTML = '<i class="fas fa-microphone"></i>';
            micStatus.textContent = 'Microphone active';
        }
        
        function hideSessionInfo() {
            document.getElementById('sessionInfo').style.display = 'none';
        }

        function applyRemoteSettings(s) {
            if (!s) return;
            if (s.bootstrapUrl) document.getElementById('bootstrapUrl').value = s.bootstrapUrl;
            if (s.agentId) document.getElementById('agentId').value = s.agentId;
            if (s.domainUrl) document.getElementById('domainUrl').value = s.domainUrl;
            if (s.salesforceEndpoint) document.getElementById('salesforceEndpoint').value = s.salesforceEndpoint;
            saveSettings();
            // Reconnect with new settings
            disconnectSession().then(() => startVoiceSession());
        }
        
        function showErrorDetails(error) {
            const status = document.getElementById('status');
            const existingDetails = status.querySelector('.error-details');
            if (existingDetails) existingDetails.remove();
            
            const details = document.createElement('div');
            details.className = 'error-details';
            details.innerHTML = `
                <strong>Error Details:</strong><br>
                ${error.message || error.toString()}
                ${error.stack ? `<br><br><small>${error.stack}</small>` : ''}
            `;
            status.appendChild(details);
        }
        
        function clearErrorDetails() {
            const existingDetails = document.querySelector('.error-details');
            if (existingDetails) existingDetails.remove();
        }
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (room) {
                room.disconnect();
            }
        });
    </script>
</body>
</html>
"""

def _get_by_path(obj, path):
    """Navigate nested dictionary using dot notation"""
    cur = obj
    for p in path.split("."):
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return None
    return cur

def _find_first_jwt(obj):
    """Recursively find first JWT token in response"""
    import re
    jwt_re = re.compile(r'^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$')
    if isinstance(obj, dict):
        for v in obj.values():
            t = _find_first_jwt(v)
            if t: return t
    elif isinstance(obj, list):
        for v in obj:
            t = _find_first_jwt(v)
            if t: return t
    elif isinstance(obj, str) and jwt_re.match(obj):
        return obj
    return None

def _find_first_wss(obj):
    """Recursively find first WSS URL in response"""
    if isinstance(obj, dict):
        for v in obj.values():
            t = _find_first_wss(v)
            if t: return t
    elif isinstance(obj, list):
        for v in obj:
            t = _find_first_wss(v)
            if t: return t
    elif isinstance(obj, str) and obj.startswith("wss://"):
        return obj
    return None

def extract_livekit_creds(join_data):
    """Extract LiveKit token and URL from join response"""
    token_paths = ["room.token","room.accessToken","room.jwt","roomToken","roomJWT","token","accessToken","jwt"]
    url_paths = ["endpoint","room.url","room.serverUrl","room.wss","wss","wssUrl","wsUrl","url"]
    
    tok, url = None, None
    
    # Try specific paths first
    for p in token_paths:
        t = _get_by_path(join_data, p)
        if isinstance(t, str) and t.count(".") == 2:
            tok = t
            break
    
    for p in url_paths:
        u = _get_by_path(join_data, p)
        if isinstance(u, str) and u.startswith("wss://"):
            url = u
            break
    
    # Fallback to recursive search
    if not tok:
        tok = _find_first_jwt(join_data)
    if not url:
        url = _find_first_wss(join_data)
    
    return tok, url

def get_bootstrap_token(bootstrap_url_template=None, agent_id=None, domain_url=None):
    """Get access token from Salesforce bootstrap endpoint"""
    bootstrap_url = bootstrap_url_template or BOOTSTRAP_URL_TEMPLATE
    agent_id_val = agent_id or AGENT_ID
    domain_url_val = domain_url or DOMAIN_URL
    
    if not bootstrap_url or not agent_id_val:
        raise ValueError("Bootstrap URL and Agent ID must be provided")
    
    url = bootstrap_url.format(AGENT_ID=agent_id_val)
    headers = {"Origin": domain_url_val or ""}
    
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()

def create_session(access_token, agent_id=None, salesforce_endpoint=None, domain_url=None, user_id=None):
    """Create AgentForce session"""
    salesforce_endpoint_val = salesforce_endpoint or SALESFORCE_ENDPOINT
    agent_id_val = agent_id or AGENT_ID
    domain_url_val = domain_url or DOMAIN_URL
    
    if not salesforce_endpoint_val or not agent_id_val:
        raise ValueError("Salesforce endpoint and Agent ID must be provided")
    
    url = f"{salesforce_endpoint_val}/einstein/ai-agent/v1.1/agents/{agent_id_val}/sessions"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Origin": domain_url_val or "",
        "Referer": domain_url_val or ""
    }
    
    # Use user_id in external session key for multi-user support
    session_key = f"{user_id or 'user'}-{os.urandom(8).hex()}"
    
    payload = {
        "externalSessionKey": session_key,
        "instanceConfig": {"endpoint": domain_url_val},
        "tz": "America/Los_Angeles",
        "variables": [{"name": "$Context.EndUserLanguage", "type": "Text", "value": "en_US"}],
        "featureSupport": "",
        "bypassUser": True,
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()

def join_realtime_session(access_token, session_id, salesforce_endpoint=None, domain_url=None):
    """Join realtime voice session"""
    salesforce_endpoint_val = salesforce_endpoint or SALESFORCE_ENDPOINT
    domain_url_val = domain_url or DOMAIN_URL
    
    if not salesforce_endpoint_val:
        raise ValueError("Salesforce endpoint must be provided")
    
    url = f"{salesforce_endpoint_val}/einstein/ai-agent/v1.1/realtime/sessions/{session_id}/join"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Origin": domain_url_val or "",
        "Referer": domain_url_val or ""
    }
    
    response = requests.post(url, headers=headers, json={}, timeout=30)
    response.raise_for_status()
    return response.json()

@app.route('/')
def index():
    """Main page with voice interface"""
    if os.getenv("APP_MODE", "main").lower() == "control":
        return redirect('/control')
    return render_template_string(HTML_TEMPLATE)

@app.route('/control')
def control_page():
    """Remote control page to manage a device session"""
    CONTROL_HTML = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Agentforce Remote Control</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            :root {
                --sf-blue-primary: #0176d3;
                --sf-blue-secondary: #014486;
                --sf-blue-light: #1589ee;
                --sf-gray-light: #f3f3f3;
                --sf-gray-medium: #dddbda;
                --sf-error: #ea001e;
            }
            body {
                font-family: 'Salesforce Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(180deg, rgba(186,1,255,0.9) 0%, rgba(31,9,116,0.8) 30%, rgba(1,118,211,0.9) 70%, rgba(1,68,134,1) 100%);
                min-height: 100vh; padding: 20px; color: #080707; position: relative; overflow-x: hidden;
            }
            body::before { content:''; position:fixed; inset:0; background-image:url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjE1MiIgdmlld0JveD0iMCAwIDI1NiAxNTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMC4zMzM5ODQiIHk9Ii0wLjA1NDY4NzUiIHdpZHRoPSIzMTkuNjEyIiBoZWlnaHQ9IjE3OS4zNTkiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl8zMjU4XzQzMzI0KSIvPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8zMjU4XzQzMzI0IiB4MT0iMTYwLjE0IiB5MT0iLTAuMDU0Njg3NSIgeDI9IjE2MC4xNCIgeTI9IjE3OS4zMDUiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBzdG9wLWNvbG9yPSIjQkEwMUZGIi8+PHN0b3Agb2Zmc2V0PSIwLjkiIHN0b3AtY29sb3I9IiMxRjA5NzQiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48L3N2Zz4K'); background-size:cover; background-position:center top; opacity:.3; z-index:-3; }
            body::after { content:''; position:fixed; right:0; bottom:0; width:300px; height:300px; background-image:url('Artboard 1@5x.png'); background-size:contain; background-repeat:no-repeat; opacity:.4; z-index:-2; }
            .app-header { text-align:center; margin-bottom:30px; color:white; position:relative; z-index:1; }
            .agentforce-logo { width:300px; height:auto; margin-bottom:20px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
            .app-header h1 { font-size: 2.5em; font-weight: 700; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); background: linear-gradient(45deg, #ffffff, #e0f0ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
            .subtitle { font-size:1.1em; opacity:.95; font-weight:300; text-shadow:0 1px 3px rgba(0,0,0,.4); }
            .card { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 20px; max-width: 900px; margin: 0 auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2);} 
            h1 { color: #014486; margin-bottom: 6px; }
            .muted { color: #6b778c; }
            .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
            input, select { padding: 12px 15px; border: 2px solid var(--sf-gray-medium); border-radius: 8px; min-width: 200px; background:#fff; }
            button { padding: 12px 16px; border: 0; border-radius: 8px; background: var(--sf-blue-primary); color: #fff; cursor: pointer; }
            button.secondary { background: var(--sf-gray-light); color: #09213d; border:2px solid var(--sf-gray-medium); }
            button.danger { background: var(--sf-error); }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 14px; }
            .status { margin-top: 14px; padding: 12px; background: var(--sf-gray-light); border: 1px solid rgba(255,255,255,0.6); border-radius: 8px; color: #014486;}
            .small { font-size: 12px; color: #6b778c; }
        </style>
    </head>
    <body>
        <div class="app-header">
            <svg class="agentforce-logo" viewBox="0 0 296 59" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M31.9317 43.8298L27.8046 33.8302H13.1388L9.01177 43.8298C8.86438 44.1897 8.51431 44.4204 8.1274 44.4204H1.84008C1.15838 44.4204 0.69777 43.7282 0.960317 43.0961L17.2106 3.97918C17.358 3.62386 17.7081 3.38853 18.0904 3.38853H22.7379C23.1248 3.38853 23.4703 3.61925 23.6223 3.97918L39.9785 43.0961C40.2411 43.7282 39.7805 44.4204 39.0988 44.4204H32.8161C32.4292 44.4204 32.0791 44.1851 31.9317 43.8298ZM20.4441 14.0895H20.3336L15.686 26.6778H25.0963L20.4487 14.0895H20.4441ZM64.8929 40.4843C62.4563 43.9774 58.9695 45.4171 54.8194 45.4171C46.9061 45.4171 39.0988 38.4862 39.0988 28.7266C39.0988 20.0191 46.1277 12.5898 54.7641 12.5898C58.7484 12.5898 62.3457 14.0849 64.5613 17.4119H64.6718V14.5971C64.6718 14.0664 65.1002 13.6419 65.6253 13.6419H70.8532C71.3829 13.6419 71.8067 14.071 71.8067 14.5971V39.3122C71.8067 50.4561 64.0592 56.9441 55.0359 56.9441C48.5367 56.9441 42.6823 53.414 40.0108 47.7151C39.7989 47.2629 40.1305 46.7415 40.628 46.7415H47.3391C47.7398 46.7415 48.1313 46.8984 48.4031 47.1891C50.3699 49.3025 52.6868 50.1793 55.5886 50.1793C60.6783 50.1793 64.6119 46.4092 64.9988 40.5858L64.8883 40.475L64.8929 40.4843ZM64.4507 28.7312C64.4507 23.9091 60.4665 19.3592 55.3721 19.3592C49.8724 19.3592 45.317 24.7074 46.7173 31.1123C47.574 35.0161 50.6555 38.1263 54.6167 38.5923C60.3006 39.2614 64.4461 34.3424 64.4461 28.7266L64.4507 28.7312ZM82.9166 32.3351C83.4693 35.053 86.8456 38.6569 91.3872 38.6569C94.2614 38.6569 96.6934 37.5679 98.2134 35.1592C98.3884 34.8777 98.7063 34.7208 99.0379 34.7208H105.247C105.726 34.7208 106.062 35.2099 105.883 35.6529C103.584 41.3749 97.587 45.4217 91.3872 45.4217C82.1427 45.4217 75.1691 38.2139 75.1691 29.1188C75.1691 20.0237 81.9769 12.5944 91.3319 12.5944C100.687 12.5944 107.218 19.6361 107.218 28.6205C107.218 29.548 107.112 30.5124 106.928 31.5368C106.845 31.9936 106.449 32.3351 105.984 32.3351H82.9166ZM99.6873 26.4009C98.9688 21.9664 95.9242 19.3592 91.3273 19.3592C87.2877 19.3592 83.8562 21.6895 82.6955 26.4009H99.6873ZM270.813 32.3351C271.366 35.053 274.742 38.6569 279.284 38.6569C282.158 38.6569 284.59 37.5679 286.11 35.1592C286.285 34.8777 286.603 34.7208 286.934 34.7208H293.143C293.622 34.7208 293.959 35.2099 293.779 35.6529C291.481 41.3749 285.483 45.4217 279.284 45.4217C270.039 45.4217 263.066 38.2139 263.066 29.1188C263.066 20.0237 269.873 12.5944 279.228 12.5944C288.583 12.5944 295.115 19.6361 295.115 28.6205C295.115 29.548 295.009 30.5124 294.825 31.5368C294.742 31.9936 294.346 32.3351 293.88 32.3351H270.813ZM287.584 26.4009C286.865 21.9664 283.821 19.3592 279.224 19.3592C275.184 19.3592 271.753 21.6895 270.592 26.4009H287.584ZM131.331 44.4204C130.802 44.4204 130.378 43.9913 130.378 43.4652V28.9527C130.378 22.6862 128.328 19.3592 124.178 19.3592C121.907 19.3592 117.812 20.8543 117.812 27.6191V43.4652C117.812 43.9959 117.384 44.4204 116.859 44.4204H111.41C110.88 44.4204 110.456 43.9913 110.456 43.4652V14.6063C110.456 14.0756 110.885 13.6511 111.41 13.6511H116.306C116.836 13.6511 117.26 14.0803 117.26 14.6063V16.309C119.696 13.9234 122.184 12.5944 125.726 12.5944C129.71 12.5944 137.738 15.0908 137.738 26.2348V43.4652C137.738 43.9959 137.31 44.4204 136.785 44.4204H131.336H131.331ZM178.18 29.0634C178.18 20.1898 185.319 12.5944 194.564 12.5944C203.808 12.5944 210.837 20.0791 210.837 28.9527C210.837 37.8263 203.974 45.4217 194.564 45.4217C185.153 45.4217 178.18 37.9371 178.18 29.0634ZM203.472 29.1188C203.472 24.0752 199.709 19.3592 194.504 19.3592C189.58 19.3592 185.536 23.9045 185.536 29.0634C185.536 34.2224 189.299 38.6569 194.559 38.6569C199.819 38.6569 203.472 34.2224 203.472 29.1188ZM259.662 34.3839C260.353 34.3839 260.822 35.0992 260.537 35.7267C257.727 41.9332 252.269 45.4171 245.701 45.4171C236.622 45.4171 229.372 37.9325 229.372 28.8927C229.372 19.853 236.622 12.5898 245.645 12.5898C252.117 12.5898 257.907 16.226 260.578 22.5017C260.85 23.1385 260.399 23.8445 259.708 23.8445H253.37C253.024 23.8445 252.697 23.6737 252.518 23.3738C250.942 20.7851 248.837 19.35 245.65 19.35C240.445 19.35 236.737 23.5076 236.737 28.9988C236.737 34.4901 240.721 38.6477 245.982 38.6477C248.837 38.6477 250.965 37.0834 252.495 34.8315C252.683 34.5547 252.992 34.3793 253.328 34.3793H259.666L259.662 34.3839ZM154.131 58.716C153.201 58.716 152.275 58.693 151.151 58.4299C150.336 58.2361 149.894 58.0977 149.313 57.89C148.807 57.7101 148.429 57.1056 148.678 56.4042C148.807 56.0396 149.963 52.851 150.129 52.4219C150.387 51.762 151.05 51.6051 151.543 51.7943C152.095 52.0251 152.349 52.1358 153.639 52.265C154.56 52.2973 155.389 52.1958 156.071 51.9697C156.738 51.7436 157.135 51.3606 157.591 50.7745C158.028 50.2162 158.42 49.4087 158.862 48.1581C159.286 46.9676 159.668 45.3802 160.004 43.4421L164.251 19.6868H160.608C160.188 19.6868 159.871 19.5669 159.659 19.3223C159.521 19.1654 159.369 18.8839 159.428 18.4271L160.156 14.3479C160.317 13.5081 161.027 13.3327 161.372 13.3235H165.31L165.467 12.4606C166.144 8.43676 167.512 5.36352 169.53 3.32392C171.588 1.24741 174.495 0.195312 178.166 0.195312C179.202 0.195312 180.124 0.269144 180.911 0.407578C181.74 0.559856 182.298 0.693675 182.901 0.882869C182.915 0.882869 182.929 0.892098 182.938 0.896712C183.546 1.13666 183.822 1.6904 183.615 2.27644L182.123 6.3787C181.92 6.87707 181.588 7.32467 180.598 7.02012C180.483 6.9832 180.271 6.9186 179.649 6.78939C179.207 6.69249 178.668 6.64173 178.166 6.64173C177.452 6.64173 176.807 6.73402 176.245 6.91398C175.725 7.0801 175.25 7.38004 174.836 7.79535C174.242 8.39523 173.822 9.0228 173.601 9.66421C173.242 10.7025 172.943 11.9299 172.703 13.3281H178.281C178.696 13.3281 179.018 13.4481 179.23 13.6926C179.368 13.8495 179.52 14.131 179.46 14.5832L178.733 18.6624C178.571 19.5023 177.876 19.6961 177.517 19.6868H171.588L167.286 44.0882C166.821 46.6907 166.236 48.9287 165.55 50.7422C164.794 52.7265 164.03 54.0416 162.915 55.2783C161.777 56.538 160.492 57.4378 159.097 57.9408C157.697 58.4484 155.978 58.716 154.131 58.716ZM151.663 13.6465V4.34372C151.663 3.81306 151.234 3.38853 150.709 3.38853H145.255C144.73 3.38853 144.302 3.81767 144.302 4.34372V13.6465H140.829C140.299 13.6465 139.876 14.0756 139.876 14.6017V19.3546C139.876 19.816 140.249 20.1852 140.705 20.1852H144.302V43.4606C144.302 43.9913 144.73 44.4158 145.255 44.4158H150.704C151.234 44.4158 151.658 43.9866 151.658 43.4606V20.1852H155.131C155.661 20.1852 156.084 19.7561 156.084 19.23V14.6017C156.084 14.071 155.656 13.6465 155.131 13.6465H151.658H151.663ZM227.216 12.599C227.216 12.599 227.166 12.599 227.133 12.599C227.078 12.599 227.009 12.599 226.931 12.6036C223.757 12.6821 222.205 13.6142 220.353 16.3644H220.243V14.6063C220.243 14.0756 219.814 13.6511 219.289 13.6511H214.448C213.919 13.6511 213.495 14.0803 213.495 14.6063V43.4652C213.495 43.9959 213.923 44.4204 214.448 44.4204H219.897C220.427 44.4204 220.851 43.9913 220.851 43.4652V26.8993C220.851 22.4648 222.956 20.0929 227.069 19.7745C227.336 19.7561 227.548 19.5346 227.548 19.2669V13.0558C227.557 12.8482 227.465 12.6498 227.216 12.6036V12.599Z" fill="url(#paint0_linear_3258_43327)"/>
                <defs>
                    <linearGradient id="paint0_linear_3258_43327" x1="-33.2188" y1="29.4603" x2="320.492" y2="29.4603" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#7CB1FE"/>
                        <stop offset="0.51" stop-color="#D6E6FF"/>
                        <stop offset="1" stop-color="#7CB1FE"/>
                    </linearGradient>
                </defs>
            </svg>
            <h1>Agentforce Remote Control</h1>
            <div class="subtitle">Send commands to a device running the voice app</div>
        </div>
        <div class="card">
            <div class="row">
                <input id="deviceId" placeholder="Device ID (leave to target 'default-phone')"/>
                <button class="secondary" onclick="generate()">Generate</button>
            </div>
            <div class="grid">
                <button onclick="send('end')"><i class="fas fa-stop"></i> End Session</button>
                <button onclick="send('new')"><i class="fas fa-plus"></i> Create New Session</button>
                <button onclick="send('creds')"><i class="fas fa-key"></i> Get LiveKit Credentials</button>
                <button onclick="send('join')"><i class="fas fa-plug"></i> Join LiveKit Room</button>
                <button onclick="send('mute_mic')"><i class="fas fa-microphone-slash"></i> Mute Mic</button>
                <button onclick="send('unmute_mic')"><i class="fas fa-microphone"></i> Unmute Mic</button>
                <button onclick="send('mute_speaker')"><i class="fas fa-volume-xmark"></i> Mute Speaker</button>
                <button onclick="send('unmute_speaker')"><i class="fas fa-volume-high"></i> Unmute Speaker</button>
                <button class="danger" onclick="send('restart_flow')"><i class="fas fa-rotate"></i> Restart Flow</button>
            </div>
            
            <h3 style="margin-top:16px">Settings</h3>
            <div class="row">
                <input id="mainApiBase" placeholder="Main API URL (e.g., https://agentforce-voice-main-xxxx.herokuapp.com)" style="flex:1"/>
            </div>
            <div class="row">
                <input id="s_bootstrapUrl" placeholder="Bootstrap URL" style="flex:1"/>
                <input id="s_agentId" placeholder="Agent ID"/>
            </div>
            <div class="row">
                <input id="s_domainUrl" placeholder="Domain URL" style="flex:1"/>
                <input id="s_salesforceEndpoint" placeholder="Salesforce Endpoint" style="flex:1"/>
            </div>
            <div class="row">
                <button onclick="applySettings()"><i class="fas fa-paper-plane"></i> Apply to Device</button>
                <button class="secondary" onclick="saveSettingsPreset()"><i class="fas fa-save"></i> Save Preset</button>
                <select id="presetSelect"></select>
                <button class="secondary" onclick="loadPreset()">Load Preset</button>
            </div>
            <div class="status" id="status">Ready</div>
        </div>
        <script>
            function q(name){ const u=new URL(window.location.href); return u.searchParams.get(name); }
            function apiBase(){
                const el = document.getElementById('mainApiBase');
                const val = (el.value || localStorage.getItem('main_api_base') || q('mainBase') || '').trim();
                if (val && !el.value) el.value = val;
                if (val) localStorage.setItem('main_api_base', val);
                return val || window.location.origin; // fallback to same app
            }
            function did(){ return (document.getElementById('deviceId').value || 'default-phone').trim(); }
            function setStatus(t){ document.getElementById('status').textContent = t; }
            function generate(){ document.getElementById('deviceId').value = 'dev-' + Math.random().toString(36).slice(2,8); }
            function readSettings(){
                return {
                    bootstrapUrl: document.getElementById('s_bootstrapUrl').value.trim(),
                    agentId: document.getElementById('s_agentId').value.trim(),
                    domainUrl: document.getElementById('s_domainUrl').value.trim(),
                    salesforceEndpoint: document.getElementById('s_salesforceEndpoint').value.trim(),
                };
            }
            function loadPresets(){
                const presets = JSON.parse(localStorage.getItem('control_presets')||'[]');
                const sel = document.getElementById('presetSelect'); sel.innerHTML='';
                presets.forEach((p,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=p.name; sel.appendChild(o); });
            }
            function saveSettingsPreset(){
                const name = prompt('Preset name?'); if(!name) return;
                const presets = JSON.parse(localStorage.getItem('control_presets')||'[]');
                presets.push({name, ...readSettings(), savedAt: new Date().toISOString()});
                localStorage.setItem('control_presets', JSON.stringify(presets));
                loadPresets();
                setStatus('Preset saved');
            }
            function loadPreset(){
                const presets = JSON.parse(localStorage.getItem('control_presets')||'[]');
                const idx = parseInt(document.getElementById('presetSelect').value||'-1',10);
                const p = presets[idx]; if(!p) return;
                document.getElementById('s_bootstrapUrl').value = p.bootstrapUrl||'';
                document.getElementById('s_agentId').value = p.agentId||'';
                document.getElementById('s_domainUrl').value = p.domainUrl||'';
                document.getElementById('s_salesforceEndpoint').value = p.salesforceEndpoint||'';
            }
            async function applySettings(){
                await send('set_settings', readSettings());
            }
            async function send(cmd, payload){
                setStatus('Sending command: ' + cmd + ' ...');
                const base = apiBase();
                const res = await fetch(base + '/api/control/command', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ deviceId: did(), command: cmd, payload }) });
                const data = await res.json();
                setStatus((base !== window.location.origin ? '[to main] ' : '') + (data.message || JSON.stringify(data)));
            }
            // Initialize from deviceId URL param if present
            (function(){ const id = q('deviceId'); if (id){ document.getElementById('deviceId').value = id; } const mb=q('mainBase'); if(mb){ document.getElementById('mainApiBase').value=mb; } loadPresets(); apiBase(); })();
        </script>
    </body>
    </html>
    """
    return render_template_string(CONTROL_HTML)

@app.route('/api/start-session', methods=['POST'])
def start_session():
    """API endpoint to create voice session and return LiveKit credentials"""
    try:
        # Get configuration from request body or fall back to environment variables
        config = request.get_json() or {}
        
        bootstrap_url = config.get('bootstrapUrl') or BOOTSTRAP_URL_TEMPLATE
        agent_id = config.get('agentId') or AGENT_ID
        domain_url = config.get('domainUrl') or DOMAIN_URL
        salesforce_endpoint = config.get('salesforceEndpoint') or SALESFORCE_ENDPOINT
        user_id = config.get('userId', 'anonymous-user')
        
        # Validate required fields
        if not all([bootstrap_url, agent_id, salesforce_endpoint]):
            missing_fields = []
            if not bootstrap_url: missing_fields.append('Bootstrap URL')
            if not agent_id: missing_fields.append('Agent ID')
            if not salesforce_endpoint: missing_fields.append('Salesforce Endpoint')
            
            return jsonify({
                "error": f"Missing required configuration: {', '.join(missing_fields)}"
            }), 400
        
        print(f"🔧 Using configuration:")
        print(f"   User ID: {user_id}")
        print(f"   Bootstrap URL: {bootstrap_url}")
        print(f"   Agent ID: {agent_id}")
        print(f"   Domain URL: {domain_url}")
        print(f"   Salesforce Endpoint: {salesforce_endpoint}")
        
        # Get bootstrap token
        print("🔍 Getting bootstrap token...")
        token_data = get_bootstrap_token(bootstrap_url, agent_id, domain_url)
        
        access_token = token_data.get("access_token") or token_data.get("accessToken")
        if not access_token:
            return jsonify({"error": "Access token not found in bootstrap response"}), 500
        
        print(f"🎫 Got access token: {access_token[:50]}...")
        
        # Create session
        print("🔍 Creating AgentForce session...")
        session_data = create_session(access_token, agent_id, salesforce_endpoint, domain_url, user_id)
        
        session_id = session_data.get("sessionId")
        if not session_id:
            return jsonify({"error": "Session ID not found in response"}), 500
        
        print(f"🆔 Created session: {session_id}")
        
        # Join realtime session
        print("🔍 Joining realtime voice session...")
        join_data = join_realtime_session(access_token, session_id, salesforce_endpoint, domain_url)
        
        # Extract LiveKit credentials
        livekit_token, livekit_url = extract_livekit_creds(join_data)
        
        if not livekit_token or not livekit_url:
            return jsonify({
                "error": "Could not find LiveKit credentials in response",
                "debug": join_data
            }), 500
        
        print(f"🎫 LiveKit token: {livekit_token[:50]}...")
        print(f"🌐 LiveKit URL: {livekit_url}")
        
        return jsonify({
            "sessionId": session_id,
            "livekitUrl": livekit_url,
            "token": livekit_token,
            "success": True
        })
        
    except requests.exceptions.RequestException as e:
        error_msg = f"API request failed: {str(e)}"
        if hasattr(e, 'response') and e.response:
            error_msg += f" (Status: {e.response.status_code})"
            if e.response.text:
                error_msg += f" Response: {e.response.text[:200]}"
        
        print(f"❌ Request error: {error_msg}")
        return jsonify({"error": error_msg}), 502
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"❌ Unexpected error: {error_msg}")
        traceback.print_exc()
        return jsonify({"error": error_msg}), 500

@app.route('/health')
def health():
    """Health check endpoint for Heroku"""
    return jsonify({"status": "healthy", "service": "agentforce-voice"})

def _queue_for(device_id: str):
    if device_id not in COMMAND_QUEUES:
        COMMAND_QUEUES[device_id] = deque()
    return COMMAND_QUEUES[device_id]

@app.route('/api/control/command', methods=['POST'])
def enqueue_command():
    body = request.get_json() or {}
    device_id = (body.get('deviceId') or 'default-phone').strip()
    command = (body.get('command') or '').strip()
    payload = body.get('payload')
    if not command:
        return jsonify({"error": "Missing 'command'"}), 400
    q = _queue_for(device_id)
    # store as structured message so we can carry payloads
    q.append({"type": command, "payload": payload})
    return jsonify({"ok": True, "deviceId": device_id, "queued": {"type": command, "payload": payload}, "queueDepth": len(q), "message": f"Queued '{command}' for {device_id}"})

@app.route('/api/control/poll', methods=['POST'])
def poll_commands():
    body = request.get_json() or {}
    device_id = (body.get('deviceId') or 'default-phone').strip()
    max_items = int(body.get('max', 5))
    wait = bool(body.get('wait', True))
    timeout_s = float(body.get('timeout', 25))
    q = _queue_for(device_id)

    # Immediate drain if commands already queued
    cmds = []
    while q and len(cmds) < max_items:
        cmds.append(q.popleft())
    if cmds or not wait:
        return jsonify({"deviceId": device_id, "commands": cmds})

    # Long-poll: wait up to timeout until a command arrives
    start = time.time()
    while time.time() - start < timeout_s:
        if q:
            while q and len(cmds) < max_items:
                cmds.append(q.popleft())
            break
        time.sleep(0.1)
    return jsonify({"deviceId": device_id, "commands": cmds})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
