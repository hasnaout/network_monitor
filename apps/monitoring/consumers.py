import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken


class AlertConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        query_string = self.scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [""])[0]

        if not token:
            await self.close(code=4401)
            return

        try:
            UntypedToken(token)
        except (InvalidToken, TokenError):
            await self.close(code=4401)
            return

        await self.channel_layer.group_add("alerts", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("alerts", self.channel_name)

    async def send_alert(self, event):
        await self.send(text_data=json.dumps(event["data"]))
