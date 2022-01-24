from json.decoder import JSONDecodeError
from typing import Any, Dict

from django.contrib.sessions.serializers import PickleSerializer
from django.core.signing import JSONSerializer

from sentry.utils import metrics


class TransitionalSerializer:
    def __init__(self) -> None:
        self.pickle_serializer = PickleSerializer()
        self.json_serializer = JSONSerializer()

    def dumps(self, obj: Dict[str, Any]) -> bytes:
        return self.json_serializer.dumps(obj)

    def loads(self, data: bytes) -> Dict[str, Any]:
        try:
            metrics.incr("transitional_serializer_json_read")
            return self.json_serializer.loads(data)
        except JSONDecodeError:
            metrics.incr("transitional_serializer_pickle_read")
            return self.pickle_serializer.loads(data)
