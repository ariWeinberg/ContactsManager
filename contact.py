from sqlalchemy import Column, INTEGER, String, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped
from custom_field import Custom_field
from DB import Base
from uuid import uuid4
from sqlalchemy_utils import PhoneNumberType


class Contact_card (Base):
    __tablename__ = "contacts"
    id = Column(String, primary_key=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone_number = Column(PhoneNumberType(region='IL'), nullable=False)
    # custom_fields: Mapped[list[Custom_field]] = relationship(back_populates="contact_id")
    custom_fields = relationship("Custom_field", back_populates="contact")
    __table_args__ = (
    UniqueConstraint('first_name', 'last_name', name='_user_full_name_uc'),
    )
    def __init__ (self, first_name: str, last_name: str, phone_number: str, custom_fields: list[Custom_field] = []):
        self.id = str(uuid4())
        self.first_name = first_name
        self.last_name = last_name
        self.phone_number = phone_number
        self.custom_fields = custom_fields


    def __repr__(self):
        return f"{self.id} | {self.first_name} {self.last_name}: {self.phone_number}, {[x for x in self.custom_fields]}."
