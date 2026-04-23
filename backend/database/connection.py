from sqlmodel import create_engine, Session, SQLModel
# Import các models để SQLModel nhận diện được khi tạo bảng
from models.db_models import User, UserProfile, MealLog 

# TODO: Đổi pass và tên database cho khớp với máy bạn nhé
DATABASE_URL = "postgresql://postgres:123@localhost:5432/DACN2"

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session