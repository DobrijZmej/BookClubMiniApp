import os
import requests
from jinja2 import Environment, FileSystemLoader
from loguru import logger

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), 'templates')
env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=False)

TELEGRAM_BOT_TOKEN = os.getenv('BOT_TOKEN')


def render_template(template_name, context):
    template = env.get_template(template_name)
    return template.render(**context)


def send_telegram_message(chat_id, text, parse_mode=None):
    if not TELEGRAM_BOT_TOKEN:
        logger.error('TELEGRAM_BOT_TOKEN is not set')
        raise RuntimeError('TELEGRAM_BOT_TOKEN is not set')
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {'chat_id': chat_id, 'text': text}
    if parse_mode:
        data['parse_mode'] = parse_mode
    try:
        response = requests.post(url, data=data)
        logger.info(f"[Telegram API] Request: {data}")
        logger.info(f"[Telegram API] Response: {response.status_code} {response.text}")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"[Telegram API] Error sending message to {chat_id}: {e} | Response: {getattr(e, 'response', None)}")
        raise


def notify(event, recipients, context, parse_mode=None):
    template_name = f"{event}.txt"
    message = render_template(template_name, context)
    for chat_id in recipients:
        send_telegram_message(chat_id, message, parse_mode=parse_mode)
