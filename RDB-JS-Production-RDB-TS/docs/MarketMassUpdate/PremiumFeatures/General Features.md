# Current Booster Features
There are marketplace booster features which will be moved to premium-only plans, including...
- Post template customization
	- Embed color
	- Author text
	- Footer text
	- Title
	- Icon

# Planned premium features
# Expedited post template approval response times
Post templates of premium individuals will be pushed to the front of the queue over regular members.
# Automatic post template approval
If a premium individuals post template is not approved within 15min of submission, it will be automatically approved by NEST.
# Sponsored Posts
All members will have **x** credits for post sponsorships, and Premium Individuals will gain **12** credits every week they are subscribed (or indefinitely, if we use a one-time donation model), up to a max of 25 credits.

These credits will count towards 1 hour of sponsorship uptime per credit consumed. Credits will be stored in milliseconds.

In terms of data, UserCredit will be stored in a separate schema, and an NEST task file will be in charge of iterating through all UserCredits and subtracting `intervalMilliseconds` from the UserCredits each interval. This will ensure that a users credits will not be consumed unfairly if the bot goes down.

Sponsored posts will automatically repost themselves so that they show first whenever a new post is posted to the marketplace.