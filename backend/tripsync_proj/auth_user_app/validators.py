from django.core.exceptions import ValidationError
import re

def username_format_validate(value:str):
    good_input = re.fullmatch(r"^[a-zA-Z0-9_-]{3,30}$", value)
    if not good_input:
        raise ValidationError(
            message = "\"%(value)s\" must be in username format.",
            params = { "value" : value}
        )

def email_format_validate(value:str):
    good_input = re.fullmatch(r"^((?!\.)[\w_.]*[^.])(@\w+)(\.\w+(\.\w+)?[^.\W])$", value)
    if not good_input:
        raise ValidationError(
            message = "\"%(value)s\" must be in email format.",
            params = { "value" : value}
        )
    