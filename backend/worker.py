import os
import time
from redis import Redis
from rq import Worker, Queue

listen = ['default']

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')

conn = Redis.from_url(redis_url)

def generate_background_video(prompt: str, match_id: str):
    """
    Simulates video generation using Vertex AI (or mock).
    In a real app, this would call Google Vertex AI (Imagen/Veo).
    """
    print(f"Starting video generation for match {match_id} with prompt: {prompt}")
    
    # Simulate processing time (video gen is slow)
    time.sleep(5)
    
    # Mock result
    video_url = "https://www.w3schools.com/html/mov_bbb.mp4"
    
    # Future: Store video URL in database for match replay
    
    print(f"Video generated: {video_url}")
    return video_url

if __name__ == '__main__':
    worker = Worker(map(Queue, listen), connection=conn)
    worker.work()
