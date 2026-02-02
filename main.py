from DB import Base, engine, Session
from contact import Contact_card
from custom_field import Custom_field, custom_field_types
from flask import Flask, send_file, jsonify, request
from sqlalchemy import Select, Update, Delete
import csv

app = Flask(__name__)

@app.get("/")
def root():
    return send_file("./index.html")
@app.get("/index.css")
def css():
    return send_file("./index.css")
@app.get("/index.js")
def js():
    return send_file("./index.js")



@app.get("/contacts")
def list_contacts():
    smst = Select(Contact_card)
    contacts = []
    with Session() as s:
        contacts = s.scalars(smst).all()

        output = []
    for c in contacts:
        contact_dict = {}
        for column in c.__table__.columns:
            value = getattr(c, column.name)
            if column.name == "phone_number" and value is not None:
                contact_dict[column.name] = str(value)
            else:
                contact_dict[column.name] = value
        output.append(contact_dict)
    
    return output

@app.post("/create-contact")
def create_contact():
    data = request.get_json()
    
    # שליפת הנתונים מה-JSON
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    phone_number = data.get('phone_number')
    
    # יצירת אובייקט חדש
    new_contact = Contact_card(
        first_name=first_name,
        last_name=last_name,
        phone_number=phone_number
    )
    
    try:
        with Session() as s:
            s.add(new_contact)
            s.commit()
            # רענון כדי לקבל את ה-ID שנוצר (אם רלוונטי)
            s.refresh(new_contact)
            return jsonify({"message": "Contact created", "id": new_contact.id}), 201
    except Exception as e:
        if '(sqlite3.IntegrityError) UNIQUE constraint failed: contacts.first_name, contacts.last_name' in e.args:
            return "duplicate contact", 400
        return jsonify({"error": str(e)}), 400

@app.route('/card/<id>')  # ב-Flask משתמשים ב-route ובסוגריים < >
def get_card(id):
    # שימוש ב-select (וודא שייבאת אותו מ-sqlalchemy)
    stmt = Select(Contact_card).where(Contact_card.id == id)
    with Session() as s:
        contact:Contact_card = None
        # first() מחזיר אובייקט אחד (Contact_card) או None
        contact = s.scalars(stmt).first()
        # print(contact.custom_fields)
    
        # בדיקה אם איש הקשר קיים
        if contact is None:
            return {"error": "Contact not found"}, 404

        # המרה לדיקשנרי עבור אובייקט בודד (בלי לולאת for על contact)
        contact_dict = {}
        for column in contact.__table__.columns:
            value = getattr(contact, column.name)
            
            # המרה לסטרינג של הטלפון (שים לב לגרשיים סביב שם העמודה)
            if column.name == "phone_number" and value is not None:
                contact_dict[column.name] = str(value)
            else:
                contact_dict[column.name] = value
        contact_dict["custom_fields"] = []

        for field in contact.custom_fields:
            i = {}
            for f_column in field.__table__.columns:
                value = getattr(field, f_column.name)
                
                i[f_column.name] = value
            contact_dict["custom_fields"].append(i)

            
    return contact_dict # Flask כבר יהפוך את זה ל-JSON אוטומטית

@app.put("/update-contact/<id>")
def update_contact(id):
    with Session() as s:
        data = request.get_json()

        contact = s.query(Contact_card).where(Contact_card.id==id).first()
        if not contact:
            return (400, "fail")
        contact.first_name = data.get("first_name")
        contact.last_name = data.get("last_name")
        contact.phone_number = data.get("phone_number")

        s.add(contact)
        s.commit()
        
    return "success"

@app.delete("/delete-contact/<cid>")
def delete_contact(cid):
    with Session() as s:
        smst = Delete(Contact_card).where(Contact_card.id == cid)
        s.execute(smst)
        s.commit()
    return "success"

@app.put("/contact/<cid>/custom-field/<cfid>")
def update_custom_field(cid, cfid):
    data = request.get_json()
    with Session() as s:
        cf = s.query(Custom_field).where(Custom_field.id == cfid).first()
        cf.field_name = data.get("field_name")
        cf.field_type = data.get("type")
        cf.raw_data = data.get("raw_data")

        s.add(cf)
        s.commit()
    return "success"

@app.delete("/contact/<cid>/custom-field/<cfid>")
def delete_custom_field(cid, cfid):
    with Session() as s:
        smst = Delete(Custom_field).where(Custom_field.id == cfid)
        s.execute(smst)
        s.commit()
    return "success"


@app.post("/contact/<cid>/custom-field")
def create_custom_field(cid):
    data = request.get_json()
    # print(data)
    with Session() as s:
        c = s.query(Contact_card).where(Contact_card.id == cid).first()
        cf = Custom_field(data.get("type"), data.get("field_name"), data.get("raw_data"), c)
        s.add(cf)
        s.add(c)
        s.commit()
    return "success"
    
@app.get("/export-contacts")
def export():
    with Session() as s, open('./temp_export.csv', 'w') as f:
        f
        w = csv.writer(f)
        for c in s.query(Contact_card).all():
            w.writerow([
    c.first_name, 
    c.last_name, 
    c.phone_number, 
    " | ".join([f"field_type: {cf.field_type}, field_name: {cf.field_name}, raw_data: {cf.raw_data}" for cf in c.custom_fields])
])


    from datetime import datetime
    return send_file("./temp_export.csv", as_attachment=True, download_name=f"{datetime.now().strftime("%Y-%m-%d_%H-%M")}_contacts_export.csv")



if __name__ == "__main__":
    Base.metadata.create_all(engine)

    app.run(debug=True)