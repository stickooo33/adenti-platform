from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Allow Node.js to talk to this Python script

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '').lower()
    
    # Simple Logic (The Brain)
    if "price" in user_message or "cost" in user_message:
        reply = "Our consultation fee is $50. Whitening starts at $200. Do you want to book?"
    elif "appointment" in user_message or "book" in user_message:
        reply = "You can book an appointment directly through the Patient Portal dashboard!"
    elif "hello" in user_message or "hi" in user_message or "hey" in user_message :
        reply = "Hello! I am DentBot 🤖. Ask me about prices, services, or hours."
    elif "hours" in user_message or "open" in user_message or "close" in user_message or "time" in user_message:
        reply = "We are open Mon-Fri from 9 AM to 6 PM."
    elif "thank" in user_message or "merci" in user_message:
        reply = "You're welcome! If you have any more questions, feel free to ask."
    elif "salam" in user_message or "salamu alaikum" in user_message:
        reply = "Wa alaikum salam! How can I assist you today?" 
    elif "how are you" in user_message or "cv" in user_message or "wassup" in user_message:
        reply = "Great ! hope your teeth are doing well 😁 ,how can I help you today sir ?" 
    elif "services" in user_message or "treatments" in user_message:
        reply = "You can book an appointment directly through the Patient Portal dashboard!"         
    else:
        reply = "I'm not sure about that ! Please call our secretary at +212 657152380 for detailed info."
    return jsonify({"reply": reply})

if __name__ == '__main__':
    print("🐍 Python AI Service running on port 5000")
    app.run(port=5000)