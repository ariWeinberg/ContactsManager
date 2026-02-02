from typing import Any
from sqlalchemy import Column, INTEGER, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from enum import Enum as En
from DB import Base
from uuid import uuid4



class custom_field_types(str, En):
    EMAIL = "email"
    BIRTH_DAY = "dob"
    ADDRESS = "address"
    COMPANY = "company"
    NOTES = "notes"


class Custom_field (Base):
    __tablename__ = "custom_fields"
    id = Column(String, primary_key=True, nullable=False)
    field_type = Column(Enum(custom_field_types), nullable=False)
    field_name = Column(String, nullable=False)
    raw_data = Column(String, nullable=False)
    contact_id: str = Column(String, ForeignKey('contacts.id'), nullable=False)
    contact = relationship("Contact_card", back_populates="custom_fields")

    # custom_field.py
    def __init__(self, type: custom_field_types, field_name, data, contact=None):
        self.field_name = field_name
        self.id = str(uuid4())
        self.field_type = type
        self.raw_data = data
        if contact:
            self.contact = contact
