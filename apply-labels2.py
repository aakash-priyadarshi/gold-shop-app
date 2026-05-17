with open('apps/web/src/app/m/quotes/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'placeholder="Internal shop notes" className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />\n        </section>',
    'placeholder="Internal shop notes" className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />\n          </div>\n        </section>'
)

with open('apps/web/src/app/m/quotes/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
