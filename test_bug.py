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

        print(f"Message count before retry: {page.locator('.message').count()}")

        # click resend
        page.hover('.message.user')
        page.click('.message.user .resend-btn')

        page.wait_for_timeout(3000)

        # check how many messages are in the dom
        print(f"Messages in DOM after resend: {page.locator('.message').count()}")

        page.screenshot(path="bug_resend.png")
        b.close()

test()
