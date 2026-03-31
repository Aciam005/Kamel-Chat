from playwright.sync_api import sync_playwright

def test():
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page()
        page.goto("http://127.0.0.1:5000")

        # set api key
        page.click('.user-profile')
        page.fill('#settings-api-key', 'test')
        page.click('#save-settings-btn')
        page.wait_for_timeout(500)

        # send msg
        page.fill("#user-input", "first msg")
        page.click("#send-btn")

        page.wait_for_timeout(2000)

        # click retry
        page.hover('.message.ai')
        page.click('.message.ai .retry-btn')

        page.wait_for_timeout(3000)

        page.screenshot(path="bug_fixed.png")
        b.close()

test()
