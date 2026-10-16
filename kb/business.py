#!/usr/bin/env python3
"""
The fictional agency the demo answers for.

A prospect pressing "Start call" on our real estate page needs to hear the
agent handle a real estate call, not an Online Marketing Help call. So the demo
has its own business, its own fees, its own patch and its own diary, and the
knowledge base is built from this file alone.

Everything here is invented and says so. The agency does not exist, the phone
number is one of Ofcom's reserved drama numbers so it cannot ring anybody, and
the addresses are made up. That matters: a demo that quotes a real agency's
fees is passing off, and a demo with a real number rings a stranger.
"""

TENANT = "demo-real-estate"

BIZ = dict(
    name="Marlborough & Hale",
    short="Marlborough and Hale",
    kind="estate and letting agency",
    town="Hullbridge",
    area="Hullbridge, Hockley, Rayleigh and the surrounding villages",
    phone="01702 960 114",          # Ofcom reserved range for drama
    email="hello@marlboroughhale.example",
    hours="Monday to Friday nine to five thirty, Saturday nine to four",
    founded="2009",
    branches="one office on Central Avenue",
    agent_name="Ruth",
)

# Who answers what. Used by the agent to route and to name a real person.
TEAM = [
    ("James Whitfield", "Senior valuer", "Hullbridge and Hockley", "Sales"),
    ("Aisha Rahman", "Valuer", "Rayleigh and Rawreth", "Sales"),
    ("Tom Beckett", "Lettings manager", "the whole patch", "Lettings"),
    ("Dawn Ellery", "Property manager", "managed portfolio", "Management"),
]

# The fees the agent is allowed to quote. Nothing else is quotable.
FEES = [
    dict(group="Selling", name="Sole agency",
         aliases=['sell my house', 'selling', 'sell', 'commission', 'what do you charge', 'fees to sell', 'estate agent fees', 'sole agency', 'percentage'], price="1.2% plus VAT",
         detail="No sale, no fee. Twelve week sole agency term, then rolling with "
                "two weeks notice. Professional photography, floorplan, EPC ordering "
                "and portal listing on Rightmove, Zoopla and OnTheMarket included."),
    dict(group="Selling", name="Multi agency",
         aliases=['multi agency', 'more than one agent', 'two agents', 'multiple agents'], price="2.4% plus VAT",
         detail="For sellers who want more than one agent on it. Same marketing "
                "package. No sale, no fee."),
    dict(group="Selling", name="Premium listing",
         aliases=['premium', 'featured', 'rightmove premium', 'boost the listing'], price="£350 plus VAT, one off",
         detail="Optional. Rightmove Premium Listing and a featured slot for the "
                "first fortnight. Added to the sale fee, payable on completion."),
    dict(group="Letting", name="Let only",
         aliases=['let only', 'find a tenant', 'tenant find', 'letting fee', 'rent it out', 'landlord fees'], price="One month's rent plus VAT",
         detail="Marketing, accompanied viewings, referencing, right to rent checks "
                "and the tenancy agreement. You manage it from there."),
    dict(group="Letting", name="Rent collection",
         aliases=['rent collection', 'collect the rent', 'chase arrears'], price="8% of rent plus VAT",
         detail="Everything in Let Only, plus collecting the rent, chasing arrears "
                "and monthly statements."),
    dict(group="Letting", name="Fully managed",
         aliases=['fully managed', 'management', 'manage it for me', 'managed service', 'landlord'], price="12% of rent plus VAT",
         detail="Everything in Rent Collection, plus maintenance, contractors, "
                "inspections twice a year, deposit handling and the end of tenancy."),
    dict(group="Letting", name="Tenant find setup",
         aliases=['setup fee', 'inventory', 'check in', 'deposit registration'], price="£295 plus VAT, one off",
         detail="Inventory, check-in and deposit registration with the DPS. Charged "
                "once at the start of each new tenancy."),
]

# Things people actually ring about, answered the way the office would answer.
FACTS = [
    ("What we do",
     "Marlborough and Hale is an independent estate and letting agency on Central "
     "Avenue in Hullbridge, covering Hullbridge, Hockley, Rayleigh, Rawreth and the "
     "surrounding villages. We have been going since 2009. We sell, we let, and we "
     "manage, from one office, which means the person who values your house is the "
     "person you deal with."),
    ("Opening hours",
     "The office is open Monday to Friday, nine until five thirty, and Saturday nine "
     "until four. We are closed on Sundays and bank holidays. Valuations and viewings "
     "can be booked outside those hours, including evenings, and that is usually when "
     "people want them."),
    ("Valuations",
     "A market appraisal is free and there is no obligation to list with us. It takes "
     "about forty five minutes. The valuer walks the property, measures up, and gives "
     "you a figure with the comparable sales it is based on, in writing, within "
     "twenty four hours. We do not give valuations over the phone, because a figure "
     "given without seeing the property is a guess."),
    ("Selling fees",
     "Sole agency is 1.2% plus VAT, no sale no fee, on a twelve week term that then "
     "goes rolling with two weeks notice. Multi agency is 2.4% plus VAT. Both include "
     "professional photography, a floorplan, EPC ordering and listing on Rightmove, "
     "Zoopla and OnTheMarket."),
    ("Letting fees",
     "Let Only is one month's rent plus VAT. Rent Collection is 8% of rent plus VAT. "
     "Fully Managed is 12% of rent plus VAT. There is a one off £295 plus VAT setup "
     "for the inventory, check-in and deposit registration at the start of each "
     "tenancy."),
    ("Viewings",
     "Viewings are accompanied by a member of the team, including evenings and "
     "Saturdays. For a buyer we ask three things first: whether you have a property "
     "to sell, whether you have a mortgage agreed in principle, and your timescale. "
     "That is not us being difficult, it is so the vendor is not shown to someone who "
     "cannot proceed, and so we do not waste your Saturday either."),
    ("How long a sale takes",
     "From offer accepted to completion is typically eight to twelve weeks in this "
     "area, longer if there is a chain or a leasehold. We chase the solicitors weekly "
     "and you get a sales progression update every Friday, whether there is news or "
     "not."),
    ("Landlord deposits",
     "Deposits are registered with the DPS within thirty days of receipt, as the law "
     "requires, and the prescribed information goes to the tenant the same day. On "
     "Fully Managed we handle the whole thing, including the end of tenancy "
     "deductions if there are any."),
    ("Maintenance and emergencies",
     "On Fully Managed, tenants report maintenance to us and we instruct our own "
     "contractors up to an agreed limit without troubling you. A genuine emergency, "
     "meaning no heat, no water, a leak or anything unsafe, goes to the on call "
     "manager at any hour. Anything else is logged and handled in working hours."),
    ("Where we are",
     "The office is on Central Avenue in Hullbridge, next to the pharmacy. There is "
     "parking on the street outside and a small car park behind the parade."),
    ("Energy certificates",
     "You need a valid EPC before a property can be marketed, for sale or to let. We "
     "order it for you if you have not got one, and the cost is added to your account."),
]

# What the agent can book. Naming these stops it offering a "free 30 minute
# consultation", which is Online Marketing Help's own language, not this
# business's, and which this business does not sell.
BOOKS = ["a free market appraisal, which is the valuation visit",
         "a viewing of a property we are marketing",
         "a lettings appointment for a landlord"]

# What the agent must never do, enforced in the prompt and tested.
NEVER = [
    "Do not value a property or give a price, a range or a 'rough idea' over the "
    "phone. Book the valuation instead. This is the single most common request and "
    "the single most important refusal.",
    "Do not negotiate on an offer, advise on one, or say whether an offer is good.",
    "Do not give legal, mortgage, tax or survey advice.",
    "Do not handle a complaint. Take the detail and pass it to the office manager.",
    "Do not quote a fee that is not in the fee list above.",
]
