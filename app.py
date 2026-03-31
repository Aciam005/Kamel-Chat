from flask import Flask, request, jsonify, render_template, Response
from flask_sqlalchemy import SQLAlchemy
import requests
import os
import json
from datetime import datetime, timezone

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Database Configuration
# ---------------------------------------------------------------------------
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///camel_chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False, default='')
    is_pinned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    messages = db.relationship('Message', backref='conversation',
                               lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title or f'Chat {self.id}',
            'is_pinned': self.is_pinned,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id'),
                                nullable=False)
    role = db.Column(db.String(16), nullable=False)       # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False, default='')
    reasoning = db.Column(db.Text, nullable=True)
    model_name = db.Column(db.String(256), nullable=True)  # e.g. 'mistralai/mistral-small-4-119b-2603'
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'role': self.role,
            'content': self.content,
            'reasoning': self.reasoning,
            'model_name': self.model_name,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }


# ---------------------------------------------------------------------------
# Human-readable model name helper
# ---------------------------------------------------------------------------
def format_model_name(raw_model):
    """Convert e.g. 'mistralai/mistral-small-4-119b-2603' → 'Mistral Small 4'.
    Models with 'thinking' in the name get a '(Thinking)' suffix.
    Returns 'Assistant' if the model string is empty / None / unrecognised."""
    if not raw_model:
        return 'Assistant'

    # Take the part after the slash (provider/model)
    slug = raw_model.split('/')[-1] if '/' in raw_model else raw_model

    is_thinking = 'thinking' in slug.lower()

    # Strip common suffixes: dates like -2603, hash-like segments, 'instruct', 'thinking', etc.
    import re
    # Normalize colons to hyphens (e.g. kimi-k2.5:thinking → kimi-k2.5-thinking)
    slug = slug.replace(':', '-')
    # Remove trailing date codes (e.g. -2603, -20250326)
    slug_clean = re.sub(r'-\d{4,}$', '', slug)
    # Remove 'thinking' token
    slug_clean = re.sub(r'-?thinking-?', '-', slug_clean, flags=re.IGNORECASE)
    # Remove 'instruct' token
    slug_clean = re.sub(r'-?instruct-?', '-', slug_clean, flags=re.IGNORECASE)
    # Remove parameter-count tokens like 119b, 70b, 8b
    slug_clean = re.sub(r'-?\d+b-?', '-', slug_clean, flags=re.IGNORECASE)
    # Collapse multiple hyphens
    slug_clean = re.sub(r'-{2,}', '-', slug_clean).strip('-')

    if not slug_clean:
        return 'Assistant'

    # Title-case each segment
    nice = ' '.join(part.capitalize() for part in slug_clean.split('-'))

    if is_thinking:
        nice += ' (Thinking)'

    return nice


# Create all tables on startup & migrate existing DB
with app.app_context():
    db.create_all()
    # Add model_name column to existing databases that lack it
    from sqlalchemy import inspect as sa_inspect, text
    insp = sa_inspect(db.engine)
    cols = [c['name'] for c in insp.get_columns('message')]
    if 'model_name' not in cols:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE message ADD COLUMN model_name VARCHAR(256)'))
            conn.commit()

# ---------------------------------------------------------------------------
# Config helpers (unchanged from original)
# ---------------------------------------------------------------------------
CONFIG_FILE = 'config.json'
DEFAULT_CONFIG = {
    "api_key": "",
    "models": ["mistralai/mistral-small-4-119b-2603"],
    "last_used_model": "mistralai/mistral-small-4-119b-2603",
    "system_prompt": ""
}


def load_config():
    if not os.path.exists(CONFIG_FILE):
        return DEFAULT_CONFIG.copy()
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return DEFAULT_CONFIG.copy()


def save_config(config_data):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=4)
    except Exception as e:
        print(f"Error saving config: {e}")


# ---------------------------------------------------------------------------
# Page Routes
# ---------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')


# ---------------------------------------------------------------------------
# Config API (unchanged)
# ---------------------------------------------------------------------------

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify(load_config())


@app.route('/api/config', methods=['POST'])
def update_config():
    data = request.json
    current_config = load_config()

    if 'api_key' in data:
        current_config['api_key'] = data['api_key']
    if 'models' in data:
        current_config['models'] = data['models']
    if 'last_used_model' in data:
        current_config['last_used_model'] = data['last_used_model']
    if 'system_prompt' in data:
        current_config['system_prompt'] = data['system_prompt']

    save_config(current_config)
    return jsonify({"status": "success", "config": current_config})


# ---------------------------------------------------------------------------
# Conversation CRUD API
# ---------------------------------------------------------------------------

@app.route('/api/conversations', methods=['GET'])
def list_conversations():
    """Return all conversations: pinned first, then by created_at desc."""
    convos = Conversation.query.order_by(
        Conversation.is_pinned.desc(),
        Conversation.created_at.desc()
    ).all()
    return jsonify([c.to_dict() for c in convos])


@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    """Create a new conversation and return its id."""
    convo = Conversation(title='')
    db.session.add(convo)
    db.session.commit()
    # Set default title now that we have an id
    if not convo.title:
        convo.title = f'Chat {convo.id}'
        db.session.commit()
    return jsonify(convo.to_dict()), 201


@app.route('/api/conversations/<int:convo_id>', methods=['PUT'])
def update_conversation(convo_id):
    """Update title and/or is_pinned."""
    convo = Conversation.query.get_or_404(convo_id)
    data = request.json or {}
    if 'title' in data:
        convo.title = data['title']
    if 'is_pinned' in data:
        convo.is_pinned = bool(data['is_pinned'])
    db.session.commit()
    return jsonify(convo.to_dict())


@app.route('/api/conversations/<int:convo_id>', methods=['DELETE'])
def delete_conversation(convo_id):
    """Delete a conversation and all its messages."""
    convo = Conversation.query.get_or_404(convo_id)
    db.session.delete(convo)
    db.session.commit()
    return jsonify({"status": "deleted"}), 200


@app.route('/api/conversations/<int:convo_id>/messages', methods=['GET'])
def get_messages(convo_id):
    """Return chat history for a conversation."""
    Conversation.query.get_or_404(convo_id)
    messages = Message.query.filter_by(conversation_id=convo_id)\
        .order_by(Message.timestamp.asc()).all()
    result = []
    for m in messages:
        d = m.to_dict()
        d['formatted_model_name'] = format_model_name(m.model_name)
        result.append(d)
    return jsonify(result)


@app.route('/api/messages/<int:msg_id>', methods=['PUT'])
def update_message(msg_id):
    """Update message content."""
    msg = Message.query.get_or_404(msg_id)
    data = request.json or {}
    if 'content' in data:
        msg.content = data['content']
    db.session.commit()
    return jsonify(msg.to_dict())


@app.route('/api/messages/<int:msg_id>', methods=['DELETE'])
def delete_message(msg_id):
    """Delete a message and all subsequent messages in the conversation."""
    msg = Message.query.get_or_404(msg_id)
    conversation_id = msg.conversation_id
    
    Message.query.filter(
        Message.conversation_id == conversation_id,
        Message.id >= msg_id
    ).delete()
    
    db.session.commit()
    return jsonify({"status": "deleted"}), 200

@app.route('/api/messages/<int:msg_id>/after', methods=['DELETE'])
def delete_messages_after(msg_id):
    """Delete all messages subsequent to a message in the conversation."""
    msg = Message.query.get_or_404(msg_id)
    conversation_id = msg.conversation_id

    Message.query.filter(
        Message.conversation_id == conversation_id,
        Message.id > msg_id
    ).delete()

    db.session.commit()
    return jsonify({"status": "deleted_after"}), 200


# ---------------------------------------------------------------------------
# Chat API (updated with persistence)
# ---------------------------------------------------------------------------

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    api_key = data.get('api_key')
    model_name = data.get('model_name', 'mistralai/mistral-small-4-119b-2603')
    user_message = data.get('message')
    conversation_id = data.get('conversation_id')
    system_prompt = data.get('system_prompt', '').strip()
    regenerate = data.get('regenerate', False)

    if not api_key:
        return jsonify({"error": "API key is required"}), 400

    if not regenerate and not user_message:
        return jsonify({"error": "message is required"}), 400

    if not conversation_id:
        return jsonify({"error": "conversation_id is required"}), 400

    convo = Conversation.query.get(conversation_id)
    if not convo:
        return jsonify({"error": "Conversation not found"}), 404

    if not regenerate:
        # Save user message to DB
        user_msg = Message(
            conversation_id=conversation_id,
            role='user',
            content=user_message
        )
        db.session.add(user_msg)
        db.session.commit()

    # Build full history from DB for the API call
    history = Message.query.filter_by(conversation_id=conversation_id)\
        .order_by(Message.timestamp.asc()).all()
    api_messages = [{"role": m.role, "content": m.content} for m in history]

    if system_prompt:
        api_messages.insert(0, {"role": "system", "content": system_prompt})

    url = "https://nano-gpt.com/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model_name,
        "messages": api_messages,
        "stream": True
    }

    try:
        req = requests.post(url, headers=headers, json=payload, stream=True)
        req.raise_for_status()

        def generate():
            full_content = ''
            full_reasoning = ''

            def save_to_db():
                if full_content or full_reasoning:
                    with app.app_context():
                        assistant_msg = Message(
                            conversation_id=conversation_id,
                            role='assistant',
                            content=full_content,
                            reasoning=full_reasoning if full_reasoning else None,
                            model_name=model_name
                        )
                        db.session.add(assistant_msg)
                        db.session.commit()
                        return assistant_msg.id
                return None

            try:
                for line in req.iter_lines():
                    if line:
                        decoded_line = line.decode('utf-8')
                        yield decoded_line + '\n\n'

                        # Parse SSE to accumulate content for DB save
                        if decoded_line.startswith('data: '):
                            data_str = decoded_line[6:].strip()
                            if data_str and data_str != '[DONE]':
                                try:
                                    parsed = json.loads(data_str)
                                    if parsed.get('choices'):
                                        delta = parsed['choices'][0].get('delta', {})
                                        msg_obj = parsed['choices'][0].get('message', {})

                                        if delta.get('content'):
                                            full_content += delta['content']
                                        if delta.get('reasoning'):
                                            full_reasoning += delta['reasoning']

                                        # Final payload sometimes uses message
                                        if msg_obj.get('content') and not delta.get('content') and not full_content:
                                            full_content = msg_obj['content']
                                        if msg_obj.get('reasoning') and not delta.get('reasoning') and not full_reasoning:
                                            full_reasoning = msg_obj['reasoning']
                                except (json.JSONDecodeError, KeyError):
                                    pass
            except GeneratorExit:
                save_to_db()
                return

            # Save assistant response to DB after stream completes
            msg_id = save_to_db()
            if msg_id:
                # Send the final ID back to the client
                yield f'data: {{"done": true, "message_id": {msg_id}}}\n\n'

        return Response(generate(), mimetype='text/event-stream')
    except requests.exceptions.RequestException as e:
        error_info = str(e)
        if hasattr(e, 'response') and e.response is not None and e.response.text:
            error_info += " | " + e.response.text
        return jsonify({"error": error_info}), 500


if __name__ == '__main__':
    app.run(debug=True)
