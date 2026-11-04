import io
import json
import unittest
import zipfile

from project_export import project_archive
from builder import finish_html, repair_navigation
from ai import run_tool


class ProjectArchiveTests(unittest.TestCase):
    def test_archive_has_vite_project_and_client_requirements(self):
        slug, contents = project_archive(
            "Marine Fleet Portal",
            "<!doctype html><html><body>Prototype</body></html>",
            '{"summary":"Fleet tracking"}',
            '{"nodes":[]}',
            "marine fleet management",
            "ocean blue and sand",
        )
        with zipfile.ZipFile(io.BytesIO(contents)) as archive:
            self.assertEqual(slug, "marine-fleet-portal")
            names = set(archive.namelist())
            expected = {
                "marine-fleet-portal/README.md",
                "marine-fleet-portal/.gitignore",
                "marine-fleet-portal/.env.example",
                "marine-fleet-portal/docker-compose.yml",
                "marine-fleet-portal/TAVIX_REQUIREMENTS.json",
                "marine-fleet-portal/docs/ARCHITECTURE.json",
                "marine-fleet-portal/docs/REQUIREMENTS.md",
                "marine-fleet-portal/frontend/package.json",
                "marine-fleet-portal/frontend/index.html",
                "marine-fleet-portal/frontend/vite.config.js",
                "marine-fleet-portal/frontend/src/main.jsx",
                "marine-fleet-portal/frontend/src/App.jsx",
                "marine-fleet-portal/frontend/src/pages/Home.jsx",
                "marine-fleet-portal/frontend/src/index.css",
                "marine-fleet-portal/frontend/public/prototype.html",
                "marine-fleet-portal/backend/main.py",
                "marine-fleet-portal/backend/models.py",
                "marine-fleet-portal/backend/requirements.txt",
                "marine-fleet-portal/backend/Dockerfile",
            }
            self.assertEqual(names, expected)
            package = json.loads(archive.read("marine-fleet-portal/frontend/package.json"))
            self.assertEqual(package["scripts"]["dev"], "vite")
            requirements = json.loads(archive.read("marine-fleet-portal/TAVIX_REQUIREMENTS.json"))
            self.assertEqual(requirements["domain"], "marine fleet management")
            self.assertEqual(requirements["visual_theme"], "ocean blue and sand")
            readme = archive.read("marine-fleet-portal/README.md").decode()
            self.assertIn("npm install", readme)
            self.assertIn("cd frontend", readme)
            self.assertIsNone(archive.testzip())

    def test_title_cannot_create_paths_outside_project_folder(self):
        slug, contents = project_archive("../../outside", "<html></html>", "{}", "{}")
        with zipfile.ZipFile(io.BytesIO(contents)) as archive:
            self.assertEqual(slug, "outside")
            self.assertTrue(all(name.startswith("outside/") for name in archive.namelist()))


class NavigationRepairTests(unittest.TestCase):
    def test_generated_sections_have_utf8_encoding(self):
        result = repair_navigation(finish_html("<html><body><nav><a href='#features'>Features</a></nav></body></html>"), {})
        self.assertIn('<meta charset="utf-8">', result)

    def test_missing_nav_destinations_get_specific_sections(self):
        source = """<!doctype html><html><body><header><nav>
          <a href="#overview">Overview</a><a href="#features">Features</a>
          <a href="#modules">Modules</a><a href="#analytics">Analytics</a>
        </nav></header><main><p>Prototype</p></main></body></html>"""
        spec = {
            "summary": "A school attendance platform.",
            "features": ["Face verification", "Attendance reports"],
            "modules": [{"name": "Identity service", "purpose": "Verifies enrolled users.", "tech": "Python"}],
            "milestones": ["Pilot with one classroom"],
        }
        result = repair_navigation(source, spec)
        for target in ("overview", "features", "modules", "analytics"):
            self.assertIn(f'id="{target}"', result)
            self.assertIn(f'href="#{target}"', result)
        self.assertIn("Face verification", result)
        self.assertIn("Identity service", result)
        self.assertIn("Illustrative preview only", result)

    def test_buttons_get_a_keyboard_activatable_destination(self):
        source = '<html><body><header><nav><button onclick="showTab()">Features</button></nav></header></body></html>'
        result = repair_navigation(source, {"features": ["Reports"]})
        self.assertIn('data-tavix-nav-target="features"', result)
        self.assertIn('id="features"', result)
        self.assertIn('addEventListener("click"', result)
        self.assertIn('stopImmediatePropagation()', result)

    def test_company_and_local_routes_stay_inside_the_prototype(self):
        source = """<html><body><header><nav>
          <a href="/">TAVIX AI</a><a href="/projects">Projects</a>
          <a href="https://tavixai.in/#contact">Contact</a>
          <a href="https://example.com">External</a>
        </nav></header><main><section id="contact">Contact</section></main></body></html>"""
        result = repair_navigation(source, {})
        self.assertIn('<a href="#">TAVIX AI</a>', result)
        self.assertIn('<a href="#projects">Projects</a>', result)
        self.assertIn('<a href="#contact">Contact</a>', result)
        self.assertIn('<a href="https://example.com">External</a>', result)


class ChatSupportTicketTests(unittest.TestCase):
    class FakeSession:
        def __init__(self):
            self.rows = []
            self.commits = 0

        def add(self, row):
            self.rows.append(row)

        def commit(self):
            self.commits += 1

        def refresh(self, row):
            row.id = 42

        def get(self, model, item_id):
            return None

    def test_confirmed_chat_complaint_is_forwarded_to_admin_ticket_queue(self):
        db = self.FakeSession()
        user = type("User", (), {"id": 7, "name": "Client"})()
        response, booking_id, ticket_id = run_tool(db, user, "create_support_ticket", {
            "subject": "Preview navigation is broken",
            "message": "Menu links do not move to their sections.",
            "category": "bug",
            "priority": "high",
            "confirmed": True,
        })

        self.assertEqual((booking_id, ticket_id), (None, 42))
        self.assertIn("submitted to the TAVIX team", response)
        ticket = next(row for row in db.rows if row.__class__.__name__ == "Ticket")
        message = next(row for row in db.rows if row.__class__.__name__ == "TicketMessage")
        self.assertEqual(ticket.user_id, user.id)
        self.assertEqual(ticket.status, "open")
        self.assertTrue(ticket.admin_unread)
        self.assertEqual(message.ticket_id, ticket.id)
        self.assertEqual(message.body, "Menu links do not move to their sections.")

    def test_chat_complaint_requires_explicit_confirmation(self):
        db = self.FakeSession()
        user = type("User", (), {"id": 7, "name": "Client"})()
        response, _, ticket_id = run_tool(db, user, "create_support_ticket", {
            "subject": "Broken preview",
            "message": "The project preview does not load.",
            "category": "bug",
            "confirmed": False,
        })
        self.assertIsNone(ticket_id)
        self.assertIn("confirm", response)
        self.assertEqual(db.rows, [])


if __name__ == "__main__":
    unittest.main()
