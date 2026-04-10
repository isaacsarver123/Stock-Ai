import requests
import sys
import json
from datetime import datetime

class StockPredictionAPITester:
    def __init__(self, base_url="https://market-pulse-ai-99.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint and verify patterns loaded and market_open status"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        if success:
            patterns_count = response.get('patterns_loaded', 0)
            market_open = response.get('market_open')
            
            patterns_ok = patterns_count >= 500
            market_status_ok = market_open is not None
            
            if patterns_ok:
                print(f"   ✅ Patterns loaded: {patterns_count} (>= 500)")
            else:
                print(f"   ❌ Insufficient patterns: {patterns_count} (< 500)")
                
            if market_status_ok:
                print(f"   ✅ Market status: {market_open}")
            else:
                print(f"   ❌ Market status missing")
                
            return patterns_ok and market_status_ok
        return False

    def test_stock_search(self):
        """Test stock search functionality"""
        success, response = self.run_test(
            "Stock Search",
            "GET",
            "search?query=AAPL",
            200
        )
        if success and 'results' in response:
            results = response['results']
            print(f"   Found {len(results)} search results")
            if len(results) > 0:
                print(f"   First result: {results[0].get('ticker', 'N/A')} - {results[0].get('name', 'N/A')}")
            return len(results) > 0
        return False

    def test_stock_quote(self):
        """Test stock quote retrieval"""
        success, response = self.run_test(
            "Stock Quote",
            "GET",
            "stock/AAPL",
            200
        )
        if success:
            required_fields = ['ticker', 'price', 'change', 'volume']
            missing_fields = [field for field in required_fields if field not in response]
            if not missing_fields:
                print(f"   ✅ All required fields present")
                print(f"   Price: ${response.get('price', 'N/A')}")
                return True
            else:
                print(f"   ❌ Missing fields: {missing_fields}")
        return False

    def test_stock_prediction(self):
        """Test AI stock prediction with expected_move_percent"""
        success, response = self.run_test(
            "Stock Prediction",
            "POST",
            "predict/AAPL",
            200,
            timeout=60  # AI calls can take longer
        )
        if success:
            required_fields = ['ticker', 'prediction', 'confidence', 'analysis', 'detected_patterns', 'expected_move_percent']
            missing_fields = [field for field in required_fields if field not in response]
            if not missing_fields:
                print(f"   ✅ All required fields present")
                print(f"   Prediction: {response.get('prediction', 'N/A')}")
                print(f"   Confidence: {response.get('confidence', 'N/A')}%")
                print(f"   Expected Move: {response.get('expected_move_percent', 'N/A')}%")
                print(f"   Patterns detected: {len(response.get('detected_patterns', []))}")
                return True
            else:
                print(f"   ❌ Missing fields: {missing_fields}")
        return False

    def test_patterns_api(self):
        """Test patterns API"""
        success, response = self.run_test(
            "Patterns API",
            "GET",
            "patterns",
            200
        )
        if success and 'patterns' in response and 'total' in response:
            total_patterns = response['total']
            patterns_returned = len(response['patterns'])
            print(f"   Total patterns: {total_patterns}")
            print(f"   Patterns returned: {patterns_returned}")
            return total_patterns >= 500
        return False

    def test_notifications_api(self):
        """Test notifications API"""
        success, response = self.run_test(
            "Notifications API",
            "GET",
            "notifications",
            200
        )
        if success and 'notifications' in response:
            notifications = response['notifications']
            print(f"   Notifications count: {len(notifications)}")
            return True
        return False

    def test_history_api(self):
        """Test prediction history API"""
        success, response = self.run_test(
            "History API",
            "GET",
            "history",
            200
        )
        if success and 'predictions' in response:
            predictions = response['predictions']
            print(f"   History count: {len(predictions)}")
            return True
        return False

    def test_chart_analysis(self):
        """Test chart image analysis"""
        # Create a simple base64 test image (1x1 pixel PNG)
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        success, response = self.run_test(
            "Chart Analysis",
            "POST",
            "analyze-chart",
            200,
            data={
                "image_base64": test_image_b64,
                "ticker": "TEST"
            },
            timeout=60
        )
        if success:
            required_fields = ['prediction', 'confidence', 'analysis']
            missing_fields = [field for field in required_fields if field not in response]
            if not missing_fields:
                print(f"   ✅ Chart analysis working")
                print(f"   Prediction: {response.get('prediction', 'N/A')}")
                return True
            else:
                print(f"   ❌ Missing fields: {missing_fields}")
        return False

    def test_market_status(self):
        """Test market status API"""
        success, response = self.run_test(
            "Market Status",
            "GET",
            "market-status",
            200
        )
        if success:
            required_fields = ['is_open', 'current_time_est', 'day_of_week', 'market_hours']
            missing_fields = [field for field in required_fields if field not in response]
            if not missing_fields:
                print(f"   ✅ All required fields present")
                print(f"   Market Open: {response.get('is_open', 'N/A')}")
                print(f"   Current Time: {response.get('current_time_est', 'N/A')}")
                print(f"   Market Hours: {response.get('market_hours', 'N/A')}")
                return True
            else:
                print(f"   ❌ Missing fields: {missing_fields}")
        return False

    def test_settings_get(self):
        """Test settings GET API"""
        success, response = self.run_test(
            "Settings GET",
            "GET",
            "settings",
            200
        )
        if success:
            expected_fields = ['id', 'notifications_enabled']
            present_fields = [field for field in expected_fields if field in response]
            print(f"   ✅ Settings retrieved")
            print(f"   Present fields: {list(response.keys())}")
            print(f"   Notifications enabled: {response.get('notifications_enabled', 'N/A')}")
            return len(present_fields) >= 1
        return False

    def test_settings_update(self):
        """Test settings PUT API"""
        test_settings = {
            "notifications_enabled": True,
            "discord_webhook_url": "https://discord.com/api/webhooks/test"
        }
        
        success, response = self.run_test(
            "Settings PUT",
            "PUT",
            "settings",
            200,
            data=test_settings
        )
        if success:
            if response.get('success'):
                print(f"   ✅ Settings updated successfully")
                return True
            else:
                print(f"   ❌ Settings update failed: {response}")
                return False
        return False

    def test_manual_news_scan(self):
        """Test manual news scan trigger"""
        success, response = self.run_test(
            "Manual News Scan",
            "POST",
            "scan/news",
            200
        )
        if success:
            if response.get('success'):
                print(f"   ✅ News scan triggered: {response.get('message', 'N/A')}")
                return True
            else:
                print(f"   ❌ News scan failed: {response}")
        return False

    def test_manual_pattern_scan(self):
        """Test manual pattern scan trigger"""
        success, response = self.run_test(
            "Manual Pattern Scan",
            "POST",
            "scan/patterns",
            200
        )
        if success:
            if response.get('success'):
                print(f"   ✅ Pattern scan triggered: {response.get('message', 'N/A')}")
                return True
            else:
                print(f"   ❌ Pattern scan failed: {response}")
        return False

def main():
    print("🚀 Starting Stock Prediction API Tests")
    print("=" * 50)
    
    tester = StockPredictionAPITester()
    
    # Run all tests
    tests = [
        tester.test_health_check,
        tester.test_market_status,
        tester.test_settings_get,
        tester.test_settings_update,
        tester.test_manual_news_scan,
        tester.test_manual_pattern_scan,
        tester.test_stock_search,
        tester.test_stock_quote,
        tester.test_patterns_api,
        tester.test_notifications_api,
        tester.test_history_api,
        tester.test_stock_prediction,  # This one takes longer, so run it later
        tester.test_chart_analysis,    # This one also takes longer
    ]
    
    failed_tests = []
    
    for test in tests:
        try:
            if not test():
                failed_tests.append(test.__name__)
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            failed_tests.append(test.__name__)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())