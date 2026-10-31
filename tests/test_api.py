import os
import unittest
from starlette.testclient import TestClient

# Ensure test DB is isolated
os.environ["DATABASE_URL"] = "sqlite:///./test_ecommerce.db"

from app import app
from database import Base, engine, SessionLocal
from seed import seed_database
import models

class TestEcommerceApp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        seed_database()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_ecommerce.db"):
            try:
                os.remove("./test_ecommerce.db")
            except Exception:
                pass

    def test_01_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")

    def test_02_auth_login_admin(self):
        res = self.client.post("/api/auth/login", json={
            "email": "admin@store.com",
            "password": "admin123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "admin")
        self.__class__.admin_token = data["access_token"]

    def test_03_auth_login_customer(self):
        res = self.client.post("/api/auth/login", json={
            "email": "user@store.com",
            "password": "user123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "customer")
        self.__class__.user_token = data["access_token"]

    def test_04_auth_register_new_user(self):
        res = self.client.post("/api/auth/register", json={
            "full_name": "Dave Miller",
            "email": "dave@example.com",
            "password": "password123",
            "role": "customer"
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], "dave@example.com")

    def test_05_get_products_and_categories(self):
        # Categories
        cat_res = self.client.get("/api/products/categories")
        self.assertEqual(cat_res.status_code, 200)
        cats = cat_res.json()
        self.assertTrue(len(cats) > 1)
        self.assertEqual(cats[0]["name"], "All")

        # Products catalog
        res = self.client.get("/api/products")
        self.assertEqual(res.status_code, 200)
        products = res.json()
        self.assertTrue(len(products) >= 5)

        # Filter by category
        res_cat = self.client.get("/api/products?category=Audio")
        self.assertEqual(res_cat.status_code, 200)
        for p in res_cat.json():
            self.assertEqual(p["category"], "Audio")

        # Search
        res_search = self.client.get("/api/products?search=Sony")
        self.assertEqual(res_search.status_code, 200)
        self.assertTrue(any("Sony" in p["name"] for p in res_search.json()))

    def test_06_admin_create_and_update_product(self):
        # Unauthorized attempt without token
        unauth_res = self.client.post("/api/products", json={
            "name": "Hacker Item",
            "description": "Exploit",
            "price": 10.0,
            "category": "Gadgets",
            "image_url": "https://example.com/item.jpg",
            "stock": 5
        })
        self.assertEqual(unauth_res.status_code, 401)

        # Customer forbidden attempt
        cust_res = self.client.post("/api/products", headers={
            "Authorization": f"Bearer {self.__class__.user_token}"
        }, json={
            "name": "Customer Created Item",
            "description": "Should fail with 403",
            "price": 10.0,
            "category": "Gadgets",
            "image_url": "https://example.com/item.jpg",
            "stock": 5
        })
        self.assertEqual(cust_res.status_code, 403)

        # Admin authorized creation
        admin_res = self.client.post("/api/products", headers={
            "Authorization": f"Bearer {self.__class__.admin_token}"
        }, json={
            "name": "Wireless Ultra Mouse X",
            "description": "Precision gaming mouse with 26000 DPI sensor",
            "price": 89.99,
            "category": "Electronics",
            "image_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46",
            "stock": 15,
            "is_featured": True
        })
        self.assertEqual(admin_res.status_code, 201)
        created_prod = admin_res.json()
        self.assertEqual(created_prod["name"], "Wireless Ultra Mouse X")
        prod_id = created_prod["id"]

        # Admin update
        update_res = self.client.put(f"/api/products/{prod_id}", headers={
            "Authorization": f"Bearer {self.__class__.admin_token}"
        }, json={"price": 79.99, "stock": 14})
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["price"], 79.99)
        self.assertEqual(update_res.json()["stock"], 14)

    def test_07_order_checkout_and_stock_deduction(self):
        # Fetch an in-stock product
        prods = self.client.get("/api/products").json()
        target = prods[0]
        initial_stock = target["stock"]

        # Place order as authenticated customer
        checkout_payload = {
            "customer_name": "Sarah Jenkins",
            "customer_email": "user@store.com",
            "customer_phone": "+1 555-4321",
            "shipping_address": "456 Silicon Ave",
            "city": "Austin",
            "postal_code": "78701",
            "country": "USA",
            "payment_method": "card",
            "promo_code": "SAVE10",
            "items": [
                {
                    "product_id": target["id"],
                    "quantity": 2
                }
            ]
        }

        order_res = self.client.post("/api/orders", headers={
            "Authorization": f"Bearer {self.__class__.user_token}"
        }, json=checkout_payload)

        self.assertEqual(order_res.status_code, 201)
        order_data = order_res.json()
        self.assertTrue(order_data["order_number"].startswith("ORD-"))
        self.assertEqual(order_data["status"], "Pending")
        self.assertTrue(order_data["discount"] > 0) # SAVE10 promo applied

        # Verify stock was decremented
        updated_prod = self.client.get(f"/api/products/{target['id']}").json()
        self.assertEqual(updated_prod["stock"], initial_stock - 2)

        self.__class__.test_order_number = order_data["order_number"]
        self.__class__.test_order_id = order_data["id"]

    def test_08_order_tracking(self):
        # Track by order number
        res = self.client.get(f"/api/orders/track/{self.__class__.test_order_number}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["order_number"], self.__class__.test_order_number)
        self.assertTrue(len(data["status_history"]) >= 1)

    def test_09_my_orders_history(self):
        res = self.client.get("/api/orders/my-orders", headers={
            "Authorization": f"Bearer {self.__class__.user_token}"
        })
        self.assertEqual(res.status_code, 200)
        orders = res.json()
        self.assertTrue(any(o["order_number"] == self.__class__.test_order_number for o in orders))

    def test_10_admin_update_order_status(self):
        update_res = self.client.put(
            f"/api/orders/{self.__class__.test_order_id}/status",
            headers={"Authorization": f"Bearer {self.__class__.admin_token}"},
            json={"status": "Shipped", "note": "Dispatched via DHL Express (Airway Bill: DHL-492048)"}
        )
        self.assertEqual(update_res.status_code, 200)
        data = update_res.json()
        self.assertEqual(data["status"], "Shipped")
        self.assertTrue(any(h["status"] == "Shipped" for h in data["status_history"]))

    def test_11_admin_stats(self):
        res = self.client.get("/api/admin/stats", headers={
            "Authorization": f"Bearer {self.__class__.admin_token}"
        })
        self.assertEqual(res.status_code, 200)
        stats = res.json()
        self.assertIn("total_revenue", stats)
        self.assertTrue(stats["total_revenue"] > 0)
        self.assertTrue(stats["total_orders"] >= 1)
        self.assertTrue(stats["total_products"] >= 5)

if __name__ == "__main__":
    unittest.main()
