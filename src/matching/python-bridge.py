"""
Python-Node.js Bridge Script
Accepts JSON input from stdin, runs AI predictions, returns JSON output
"""
import sys
import json
import os

# Set up paths - go up from backend/src/matching to project root, then into ai
project_root = os.path.join(os.path.dirname(__file__), '..', '..', '..')
ai_path = os.path.join(project_root, 'ai')
sys.path.insert(0, ai_path)

from ai_service import get_ai_service

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        command = input_data.get('command')
        data = input_data.get('data', {})
        
        # Initialize AI service
        gemini_key = os.getenv('GEMINI_API_KEY', '')
        ai_service = get_ai_service(gemini_api_key=gemini_key)
        
        result = {}
        
        if command == 'analyze':
            # Get comprehensive analysis
            creator_data = data.get('creator')
            campaign_data = data.get('campaign')
            result = ai_service.get_comprehensive_analysis(creator_data, campaign_data)
            
        elif command == 'generate_report':
            # Generate AI report with Gemini
            creator_data = data.get('creator')
            campaign_data = data.get('campaign')
            analysis = data.get('analysis')
            result = ai_service.generate_ai_report(creator_data, campaign_data, analysis)
            
        elif command == 'match_score':
            # Calculate just the match score
            creator_data = data.get('creator')
            campaign_data = data.get('campaign')
            score = ai_service.calculate_match_score(creator_data, campaign_data)
            result = {'match_score': score}
            
        else:
            result = {'error': f'Unknown command: {command}'}
        
        # Output result as JSON
        print(json.dumps(result, default=str))
        sys.stdout.flush()
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result))
        sys.stdout.flush()
        sys.exit(1)

if __name__ == '__main__':
    main()
