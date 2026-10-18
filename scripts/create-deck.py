"""Create the submission PDF and a contact sheet for visual review."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
import fitz
from PIL import Image, ImageOps, ImageDraw

out = Path('output/pdf')
out.mkdir(parents=True, exist_ok=True)
tmp = Path('tmp/pdfs')
tmp.mkdir(parents=True, exist_ok=True)
W, H = 1152, 648
green, ink, muted, cream, mint = '#173f34', '#254135', '#63735e', '#f8f8f0', '#e4ebd7'
pdf = canvas.Canvas(str(out / 'asensopost-hackathon-deck.pdf'), pagesize=(W,H))
pdf.setTitle('AsensoPost Studio | Personal Brand Builder')
pdf.setAuthor('AsensoPost Studio')
def para(text, x, y, width, size=19, color=ink, leading=None, font='Helvetica'):
    p = Paragraph(text, ParagraphStyle('p', fontName=font, fontSize=size, leading=leading or size*1.5, textColor=HexColor(color)))
    _, h = p.wrap(width, H)
    p.drawOn(pdf,x,y-h)
    return y-h
def base(n, label):
    pdf.setFillColor(HexColor(cream)); pdf.rect(0,0,W,H,fill=1,stroke=0)
    pdf.setFillColor(HexColor(green)); pdf.roundRect(45,H-62,25,25,7,fill=1,stroke=0)
    para('a',52,H-40,20,16,'#ffffff',font='Helvetica-Bold')
    para('asensopost / STUDIO',82,H-42,450,12,green,font='Helvetica-Bold')
    para(label,700,H-43,400,10,muted)
    pdf.setStrokeColor(HexColor('#dce3d4')); pdf.line(45,46,W-45,46)
    para('FUTURE OF WORK &amp; ENTERPRISE PRODUCTIVITY',45,32,700,9,muted)
    para(f'{n:02d} / 08',1030,32,100,9,muted)
def title(kicker, text, desc=''):
    para(kicker,55,550,1000,11,muted,font='Helvetica-Bold')
    para(text,55,511,1040,42,green,leading=49,font='Helvetica-Bold')
    if desc: para(desc,57,442,1000,17,muted)
def card(x,y,w,h,label,body):
    pdf.setFillColor(HexColor('#ffffff'));pdf.roundRect(x,y,w,h,12,fill=1,stroke=0)
    para(label,x+22,y+h-22,w-44,18,green,font='Helvetica-Bold')
    para(body,x+22,y+h-66,w-44,15,muted)
def finish(): pdf.showPage()

base(1,'GOOGLE CLOUD AI BUILDER CUP 2026')
para('YOUR BRAND, IN MOTION.',55,540,500,12,muted,font='Helvetica-Bold')
para('A studio for a<br/>business of one.',55,490,560,58,green,leading=67,font='Helvetica-Bold')
para('Build your brand. Create consistent content.<br/>Make room for the people it reaches.',58,305,530,21,muted)
para('AsensoPost Studio - Personal Brand Builder',58,166,550,16,green,font='Helvetica-Bold')
para('Working prototype / fictional Habi Home demo',58,129,540,12,muted)
pdf.setFillColor(HexColor(mint));pdf.roundRect(675,108,420,438,20,fill=1,stroke=0)
para('ONE SHARED BRAND CONTEXT',710,503,350,12,muted,font='Helvetica-Bold')
para('Story<br/>Voice<br/>Audience<br/>Offerings',710,450,345,38,green,leading=65,font='Helvetica-Bold')
finish()

base(2,'01 / THE PROBLEM')
title('INDEPENDENT DOES NOT MEAN DOING EVERYTHING ALONE.','One person. Too many roles.')
card(55,128,330,275,'The brand strategist','Who am I for?<br/><br/>How do I explain what makes my work different?')
card(411,128,330,275,'The content team','What should I say?<br/><br/>How do I stay consistent while running my business?')
card(767,128,330,275,'The customer desk','What is available?<br/><br/>How do I respond and follow up without losing the thread?')
finish()

base(3,'02 / THE AUDIENCE')
title('MEET MAYA, OUR DEMO CREATOR.','A personal brand with a purpose.')
para('Maya Santos runs Habi Home: a fictional independent craft brand working with local weavers.',58,405,480,24,green)
para('Her goal is to tell a thoughtful story, reach people who care about craft, and handle the interest her work creates.',58,280,480,19,muted)
card(615,160,480,245,'Built for independent operators','Creators, professionals, and small business owners.<br/><br/>Start with one clear brand and a small set of offerings. Grow the workflow when real needs justify it.')
finish()

base(4,'03 / THE CONNECTED WORKSPACE')
title('FROM AN IDEA TO A CUSTOMER CONVERSATION.','Six places. One shared context.')
for i,(label,body) in enumerate([
 ('Overview','See your next actions and actual workspace activity.'),
 ('Brand Studio','Save your story, voice, promise, and brand guidelines.'),
 ('Content Studio','Generate and edit captions with branded previews.'),
 ('Calendar','Organize content and open campaign storefront links.'),
 ('Audience & Insights','Define audiences and explore suggested content pillars.'),
 ('Customer Hub','Answer inquiries and review orders with human control.')]):
    col,row=i%3,i//3
    card(55+col*356,260-row*174,330,152,label,body)
finish()

base(5,'04 / MEANINGFUL GOOGLE AI')
title('THE CONTEXT FOLLOWS THE WORK.','AI that knows the brand.')
card(55,130,504,270,'Create with context','Gemini receives the saved story, audience, and voice.<br/><br/>Generate guidelines, caption options, creative direction, and audience suggestions. Every output stays editable.')
card(585,130,510,270,'Respond with facts','Customer replies use approved catalog and policy information, with Google Sheets-backed availability.<br/><br/>The server calculates totals. Explicit customer review and owner acceptance control order commitments.')
para('Local fallback output is labeled. Final live Gemini verification remains pending cloud access.',58,92,1030,12,muted)
finish()

base(6,'05 / GOOGLE CLOUD ARCHITECTURE')
title('ONE DEPLOYMENT URL. A SMALL, INSPECTABLE STACK.','Built for Google Cloud.')
labels=[('REACT + TYPESCRIPT','Six workspace pages and two public views'),('CLOUD RUN / NODE API','Validation, AI calls, access control, order decisions'),('GEMINI + FIRESTORE + SHEETS','Generation, saved workspace state, stock and orders')]
for i,(label,body) in enumerate(labels):
    y=328-i*100
    pdf.setFillColor(HexColor(mint if i%2==0 else '#ffffff'));pdf.roundRect(140,y,872,80,11,fill=1,stroke=0)
    para(label,170,y+60,820,17,green,font='Helvetica-Bold');para(body,170,y+31,820,13,muted)
para('Cloud Run image and deployment command are prepared; live cloud deployment is pending.',145,88,880,12,muted)
finish()

base(7,'06 / VALIDATION & IMPACT')
title('SHOW THE WORK. MEASURE WHAT HAPPENS.','Evidence over assumptions.')
card(55,140,504,260,'Local automated checks','Server-calculated totals and order confirmation.<br/>Retry-safe submission and stock adjustment.<br/>Customer session isolation and human takeover.<br/>Brand-to-content-to-order browser journey.<br/>Mobile layout checks.')
card(585,140,510,260,'What to measure next','Time to an approved content draft.<br/>Time to a prepared customer request.<br/>Live Gemini response quality and latency.<br/>Firestore persistence and Sheets sync reliability.<br/><br/>No adoption or productivity percentage is claimed.')
finish()

base(8,'07 / THE NEXT CHAPTER')
title('SMALL STUDIO. BIG POSSIBILITIES.','Give one person room to grow.')
para('The prototype connects the work of building a brand with the work of serving the people it reaches.',58,404,600,27,green)
para('Next: validate with independent creators, refine the brand context, and expand integrations only when they remove a real work bottleneck.',58,280,600,19,muted)
card(735,150,360,255,'Submission status','Application source and test suite: ready locally.<br/><br/>Cloud URL, live integration evidence, and final public video: pending.<br/><br/>Demo script: 2 minutes 45 seconds.')
para('Event requirements: aibuildercup.com/Faqs.html',58,100,620,11,muted)
finish()
pdf.save()
doc=fitz.open(out/'asensopost-hackathon-deck.pdf')
contact=Image.new('RGB',(1152,4*338),'#e6e8df')
for i,page in enumerate(doc):
    pix=page.get_pixmap(matrix=fitz.Matrix(.5,.5),alpha=False)
    img=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
    contact.paste(img,((i%2)*576,(i//2)*338))
contact.save(tmp/'deck-contact.png')
print(f'Created {len(doc)} slides: {out / "asensopost-hackathon-deck.pdf"}')
