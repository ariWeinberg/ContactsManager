from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

class Base(DeclarativeBase):
    pass


engine = create_engine("sqlite:///contacts.db")

Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)
