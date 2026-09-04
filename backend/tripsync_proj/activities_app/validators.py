from django.core.exceptions import ValidationError


def validate_cost_cents(value: int):
    good_input = value >= 0
    if not good_input:
        raise ValidationError(
            message='"%(value)s" is not a valid cost. Enter whole cents, 0 or more.',
            params={"value": value},
        )
