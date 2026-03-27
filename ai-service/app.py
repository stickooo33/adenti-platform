from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import re  # Import pour lire les formats de texte comme les dates

app = Flask(__name__)
CORS(app) # Autorise Node.js à communiquer avec ce script Python

# --- NOUVEAU: Mémoire du chatbot (Contexte de session) ---
# Cela permet au bot de se souvenir du type de soin et de la date entre deux messages.
# Supporte plusieurs sessions clients via sessionId transmis par le frontend.
session_context = {}

def get_session_context(session_id):
    if not session_id:
        session_id = '_anon'
    if session_id not in session_context:
        session_context[session_id] = {"type": None, "date": None}
    return session_context[session_id]

def get_bot_response(msg, session_id=None):
    context = get_session_context(session_id)
    message = msg.lower()
    
    # Types de soins reconnus (avec tolérance pour les fautes de frappe et synonymes)
    treatments = {
        "blanchiment": "Blanchiment",
        "blanchir": "Blanchiment",
        "détartrage": "Détartrage",
        "detartrage": "Détartrage",
        "detartage": "Détartrage", # Faute courante
        "tartre": "Détartrage",
        "nettoyage": "Détartrage",
        "canal": "Traitement de Canal",
        "carie": "Traitement de Canal",
        "plombage": "Traitement de Canal",
        "controle": "Contrôle Général",
        "contrôle": "Contrôle Général",
        "visite": "Contrôle Général",
        "consultation": "Contrôle Général",
        "mal": "Urgence",
        "douleur": "Urgence",
        "urgence": "Urgence",
        "arracher": "Urgence",
        "cassé": "Urgence",
        "casse": "Urgence"
    }

    # Dates reconnues (demain, après-demain)
    today = datetime.now()
    dates = {
        "demain": (today + timedelta(days=1)).strftime("%Y-%m-%d"),
        "après-demain": (today + timedelta(days=2)).strftime("%Y-%m-%d"),
        "apres-demain": (today + timedelta(days=2)).strftime("%Y-%m-%d"),
        "aujourd'hui": today.strftime("%Y-%m-%d"),
        "aujourdhui": today.strftime("%Y-%m-%d")
    }

    # 1. Vérification des intentions d'annulation (pour vider la mémoire)
    # 'non' seul est autorisé si l'utilisateur veut abandonner, mais pas pour des phrases normales.
    normalized = message.strip()
    if re.match(r'^(annuler|stop|oublier|cancel|non\s+merci|non|pas\s+maintenant)$', normalized):
        context["type"] = None
        context["date"] = None
        return {
            "reply": "D'accord, j'ai annulé la demande en cours. Comment puis-je vous aider ?"
        }

    # 2. Vérification des intentions de contact direct
    if any(x in message for x in ["téléphone", "numero", "numéro", "appeler", "contact", "joindre", "secrétaire", "secrétariat"]):
        return {
            "reply": "Vous pouvez appeler notre secrétariat directement au +212 657152380 pour plus d'informations ou pour une assistance immédiate."
        }
        
    # 3. Vérification des intentions d'inscription / création de compte
    if any(x in message for x in ["compte", "inscription", "inscrire", "nouveau patient", "enregistrer"]):
        return {
            "reply": "Pour prendre rendez-vous et accéder à votre jumeau numérique 3D, veuillez créer un compte en cliquant sur l'onglet 'Inscription' du Portail Patient. Si vous avez besoin d'aide, appelez le secrétariat au +212 657152380."
        }

    # --- MISE À JOUR DE LA MÉMOIRE ---
    
    # Recherche du type de soin dans le message actuel
    for key, val in treatments.items():
        if key in message:
            context["type"] = val
            break
            
    # Recherche d'une date numérique (ex: 4/30, 29/03, 30-4) dans le message actuel
    match = re.search(r'\b(\d{1,2})[/-](\d{1,2})\b', message)
    if match:
        num1 = int(match.group(1))
        num2 = int(match.group(2))
        
        # Déduction intelligente (Supporte FR: 29/03 et US: 03/29 ou 4/30)
        if num2 > 12:
            day, month = num2, num1
        else:
            day, month = num1, num2 # Format Français par défaut (Jour/Mois)
            
        try:
            target_date = datetime(today.year, month, day)
            # Si la date est déjà passée, on la planifie pour l'année suivante
            if target_date < today - timedelta(days=1):
                target_date = datetime(today.year + 1, month, day)
            context["date"] = target_date.strftime("%Y-%m-%d")
        except ValueError:
            pass # Ignore les dates invalides comme 31/02

    # Si aucune date numérique n'est trouvée, chercher dans les mots-clés (demain, etc.)
    if not match:
        for key, val in dates.items():
            if key in message:
                context["date"] = val
                break

    # --- LOGIQUE DE RÉPONSE BASÉE SUR LA MÉMOIRE GLOBALE ---
    
    c_type = context["type"]
    c_date = context["date"]

    if c_type == "Urgence":
        # On vide la mémoire car c'est une urgence traitée
        context["type"] = None
        context["date"] = None
        return {
            "reply": "⚠️ En cas d'urgence dentaire ou de forte douleur, veuillez contacter notre secrétariat IMMÉDIATEMENT au +212 657152380."
        }
        
    elif c_type and c_date:
        # On a tout ! On renvoie l'action et on VIDE la mémoire pour le prochain RDV
        context["type"] = None
        context["date"] = None
        return {
            "reply": f"Parfait, j'ai préparé votre demande de RDV pour un {c_type} le {c_date}.",
            "action": "CREATE_APPOINTMENT",
            "details": {
                "type": c_type,
                "date": c_date,
                "time": "10:00" # Heure par défaut pour la démo
            }
        }
        
    elif c_type:
        return {
            "reply": f"Je peux vous aider pour un {c_type}. Quelle date vous conviendrait ? (ex: demain, 25/04, etc.). Sinon, appelez-nous au +212 657152380."
        }
        
    elif c_date:
        return {
            "reply": f"J'ai bien noté la date du {c_date}. Pour quel type de soin souhaitez-vous ce rendez-vous ? (ex: détartrage, contrôle...)"
        }
        
    elif any(x in message for x in ["rdv", "rendez-vous", "rendez vous", "planifier", "prendre"]):
        return {
            "reply": "Pour prendre un rendez-vous, pourriez-vous m'indiquer le type de soin souhaité ? (ex: contrôle de routine, détartrage, blanchiment...)"
        }
        
    elif any(x in message for x in ["bonjour", "salut", "hello", "hi"]):
        return {
            "reply": "Bonjour ! Je suis l'assistant virtuel ADENTI 🤖. Souhaitez-vous prendre un rendez-vous, créer un compte, ou parler à notre secrétariat (+212 657152380) ?"
        }
        
    elif "prix" in message or "tarif" in message or "combien" in message:
        return {
            "reply": "Nos consultations sont à 300 DH et le détartrage à 450 DH. Pour un devis précis, veuillez appeler notre secrétariat au +212 657152380."
        }
    elif "horaires" in message or "heures" in message or "ouvert" in message:
        return {
            "reply": "Nous sommes ouverts du lundi au samedi de 9h à 19h. Pour prendre rendez-vous, veuillez me dire quel type de soin vous souhaitez ou appelez notre secrétariat au +212 657152380."
        }
    elif "services" in message or "soins" in message or "traitements" in message:
        return {
            "reply": "Nous proposons des soins de blanchiment, détartrage, traitement de canal, contrôle général et urgences dentaires. Pour prendre rendez-vous, dites-moi quel soin vous intéresse ou appelez notre secrétariat au +212 657152380."
        }
    elif "d'accord" in message or "dacc" in message or "Ok" or "bon" in message:
        return {
            "reply": "Parfait ! N'hésitez pas à me donner plus de détails " 
        }
        
    elif "merci" in message:
        return {
            "reply": "Je vous en prie ! Prenez soin de votre sourire. 😁"
        }
        
    else:
        return {
            "reply": "Je suis un assistant en apprentissage et je ne suis pas sûr de bien comprendre. Pour plus d'informations, veuillez appeler notre secrétariat directement au +212 657152380."
        }

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    session_id = data.get('sessionId', None)
    
    # On récupère la réponse structurée depuis notre "Cerveau"
    response_data = get_bot_response(user_message, session_id)
    
    return jsonify(response_data)

if __name__ == '__main__':
    print("🐍 Python AI Service (Flask) running on port 5000")
    app.run(port=5000)