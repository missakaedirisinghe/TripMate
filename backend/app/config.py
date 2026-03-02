import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-fallback-secret-key-for-tripmate'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://postgres:postgres@localhost:5432/tripmate'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # ML Model Config
    MODEL_PATH = os.environ.get('MODEL_PATH') or '../Prediction Model/Recommendation Model.pkl'
