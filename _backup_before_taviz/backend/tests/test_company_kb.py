import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import company_kb as k

CASES = {
    "who is the founder": "Who founded TAVIX",
    "how do you hire": "How does TAVIX hire",
    "what is one tavix ai": "What is ONE TAVIX AI",
    "what is tavix ai": "What is TAVIX AI",
    "what salary do you pay": "salary",
    "how do i apply for a job": "How do I apply",
    "where did book go": "Missions, My missions and Book",
}


def test_questions_find_the_right_fact():
    for q, expect in CASES.items():
        assert expect.lower() in k.offline_answer(q).lower(), q


def test_unknown_is_not_guessed():
    assert "don't have a confirmed answer" in k.offline_answer("zzqx plumbus flarn")


def test_greeting():
    assert k.offline_answer("hello").startswith("Hello")
