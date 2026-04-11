from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import re
import os # Ajouté pour lire les variables d'environnement
from twilio.rest import Client
app = Flask(__name__)
CORS(app)

# --- MÉMOIRE DU CHATBOT ---
session_context = {
    "type": None,
    "date": None,
    "phone": None # On retient le numéro du patient
}

# --- FONCTION D'ENVOI SMS (DOUBLE NOTIFICATION) ---
def send_sms_notification(patient_phone, treatment, date):
    # 🌟 OPTION PRO : Récupération des clés via les variables d'environnement
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    
    # Numéro Twilio (Peut aussi être mis en variable d'environnement plus tard)
    TWILIO_PHONE_NUMBER = '+16626414839' 
    
    # Le numéro de votre secrétaire
    SECRETARY_PHONE = '+212 702-954562'

    # On formate le numéro marocain du patient pour Twilio (ex: 0612345678 -> +212612345678)
    formatted_patient_phone = patient_phone
    if formatted_patient_phone.startswith('0'):
        formatted_patient_phone = '+212' + formatted_patient_phone[1:]

    # Contenu des deux messages
    msg_for_patient = f"ADENTI Clinique : Votre demande de RDV pour un {treatment} le {date} est bien enregistrée. Notre secrétariat vous contactera sous peu pour la confirmation définitive."
    msg_for_secretary = f"⚠️ NOUVELLE DEMANDE RDV : Le patient au {formatted_patient_phone} souhaite un {treatment} le {date}. Veuillez le contacter pour confirmer ou reprogrammer."

    try:
        # Vérification sécurité : Si les clés manquent, on ne tente même pas l'envoi
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            raise ValueError("Clés Twilio manquantes dans l'environnement")

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # 1. Envoi au Patient
        msg_patient = client.messages.create(
            body=msg_for_patient,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_patient_phone
        )
        print(f"✅ SUCCESS: SMS envoyé au PATIENT {formatted_patient_phone} (ID: {msg_patient.sid})")
        
        # 2. Envoi à la Secrétaire
        msg_sec = client.messages.create(
            body=msg_for_secretary,
            from_=TWILIO_PHONE_NUMBER,
            to=SECRETARY_PHONE
        )
        print(f"✅ SUCCESS: SMS envoyé à la SECRÉTAIRE {SECRETARY_PHONE} (ID: {msg_sec.sid})")

    except Exception as e:
        # Si Twilio n'est pas configuré, on simule l'envoi pour ne pas faire planter le bot !
        print(f"\n📱 [SIMULATION SMS PATIENT] -> {formatted_patient_phone} : '{msg_for_patient}'")
        print(f"📱 [SIMULATION SMS SECRÉTAIRE] -> {SECRETARY_PHONE} : '{msg_for_secretary}'")
        print(f"Erreur Twilio : {str(e)}\n")

def get_bot_response(msg):
    global session_context
    message = msg.lower()
    
    treatments = {
        "blanchiment": "Blanchiment", "blanchir": "Blanchiment",
        "détartrage": "Détartrage", "detartrage": "Détartrage", "detartage": "Détartrage", "tartre": "Détartrage", "nettoyage": "Détartrage",
        "canal": "Traitement de Canal", "carie": "Traitement de Canal", "plombage": "Traitement de Canal",
        "controle": "Contrôle Général", "contrôle": "Contrôle Général", "visite": "Contrôle Général", "consultation": "Contrôle Général",
        "mal": "Urgence", "douleur": "Urgence", "urgence": "Urgence", "arracher": "Urgence", "cassé": "Urgence", "casse": "Urgence"
    }

    today = datetime.now()
    dates = {
        "demain": (today + timedelta(days=1)).strftime("%Y-%m-%d"),
        "après-demain": (today + timedelta(days=2)).strftime("%Y-%m-%d"),
        "apres-demain": (today + timedelta(days=2)).strftime("%Y-%m-%d"),
        "aujourdhui": today.strftime("%Y-%m-%d"),
        "aujourd'hui": today.strftime("%Y-%m-%d")
    }

    # 1. Annulation
    if any(x in message for x in ["annuler", "stop", "oublier", "non"]):
        session_context = {"type": None, "date": None, "phone": None}
        return {"reply": "D'accord, j'ai annulé la demande en cours. Comment puis-je vous aider ?"}

    # 2. Contact secrétariat
    if any(x in message for x in ["téléphone", "numero", "appeler", "contact", "joindre", "secrétaire"]):
        return {"reply": "Vous pouvez appeler notre secrétariat directement au +212 702-954562 pour une assistance immédiate."}

    # 3. FAQ (Prix, Horaires, Services)
    if any(x in message for x in ["prix", "tarif", "combien", "coût", "cout", "price"]):
        return {"reply": "Nos tarifs varient selon les soins. À titre indicatif : Consultation à partir de 300 DH, Détartrage à 450 DH, Blanchiment à 1500 DH. Souhaitez-vous prendre RDV ?"}
        
    if any(x in message for x in ["heure", "horaire", "ouvert", "quand", "fermé", "fermeture"]):
        return {"reply": "La clinique ADENTI est ouverte du Lundi au Vendredi de 09h00 à 19h00, et le Samedi de 09h00 à 13h00. Nous sommes fermés le Dimanche."}
        
    if any(x in message for x in ["service", "soin", "proposez", "faites", "prestations"]):
        return {"reply": "Nous proposons divers soins : Contrôle Général, Détartrage, Blanchiment, Traitement de Canal, Extraction, et Urgences. Quel soin vous intéresse ?"}

    # --- MISE À JOUR DE LA MÉMOIRE ---
    
    # Soin
    for key, val in treatments.items():
        if key in message:
            session_context["type"] = val
            break
            
    # Date numérique
    match_date = re.search(r'\b(\d{1,2})[/-](\d{1,2})\b', message)
    if match_date:
        num1, num2 = int(match_date.group(1)), int(match_date.group(2))
        day, month = (num2, num1) if num2 > 12 else (num1, num2)
        try:
            target_date = datetime(today.year, month, day)
            if target_date < today - timedelta(days=1): target_date = datetime(today.year + 1, month, day)
            session_context["date"] = target_date.strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Date textuelle
    if not match_date:
        for key, val in dates.items():
            if key in message:
                session_context["date"] = val
                break

    # Détection du Numéro de Téléphone Marocain (ex: 0612345678)
    clean_msg_for_phone = message.replace(" ", "").replace("-", "")
    phone_match = re.search(r'(?:\+212|0)[567]\d{8}', clean_msg_for_phone)
    if phone_match:
        session_context["phone"] = phone_match.group(0)

    # --- LOGIQUE DE RÉPONSE ---
    c_type = session_context["type"]
    c_date = session_context["date"]
    c_phone = session_context["phone"]

    if c_type == "Urgence":
        session_context = {"type": None, "date": None, "phone": None}
        return {"reply": "⚠️ En cas d'urgence dentaire ou de forte douleur, veuillez contacter notre secrétariat IMMÉDIATEMENT au +212 702-954562."}
        
    elif c_type and c_date and not c_phone:
        return {"reply": f"C'est noté pour le {c_date}. Quel est votre numéro de téléphone (ex: 0612345678) pour que notre secrétariat puisse vous confirmer l'horaire par SMS ?"}
        
    elif c_type and c_date and c_phone:
        send_sms_notification(c_phone, c_type, c_date)
        session_context = {"type": None, "date": None, "phone": None}
        return {
            "reply": f"Parfait ! Votre demande est enregistrée et un SMS récapitulatif a été envoyé au {c_phone}. Notre secrétariat vous appellera très vite pour valider !",
            "action": "CREATE_APPOINTMENT",
            "details": { "type": c_type, "date": c_date, "time": "10:00" } # Sera enregistré comme "En attente/Pending" par le backend Node.js
        }
        
    elif c_type:
        return {"reply": f"Je peux enregistrer une demande pour un {c_type}. Quelle date vous conviendrait ? (ex: demain, 25/04)"}
        
    elif c_date:
        return {"reply": f"J'ai bien noté la date du {c_date}. Pour quel type de soin souhaitez-vous ce rendez-vous ?"}
        
    elif any(x in message for x in ["rdv", "rendez-vous", "planifier", "prendre"]):
        return {"reply": "Pour demander un rendez-vous, pourriez-vous m'indiquer le type de soin souhaité ? (ex: détartrage, blanchiment...)"}
        
    elif any(x in message for x in ["bonjour", "salut", "hello","salam"]):
        return {"reply": "Bonjour ! Je suis l'assistant virtuel ADENTI 🤖. Souhaitez-vous planifier un rendez-vous ou parler à notre secrétariat (+212 702-954562) ?"}
    elif any(x in message for x in ["merci", "merci beaucoup", "c'est genial", "parfait"]):
        return {"reply":  "Avec plaisir 😊. Si vous avez d'autres questions ou besoin d'aide, je suis là."}                
    else:
        return {"reply": "Je suis un assistant en apprentissage. Pourriez-vous préciser le soin ou la date, ou appeler le +212 702-954562 ?"}

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    response_data = get_bot_response(user_message)
    return jsonify(response_data)

if __name__ == '__main__':
    print("🐍 Python AI Service (Flask) running on port 5000")
    app.run(port=5000)