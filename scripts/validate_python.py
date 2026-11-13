"""Valida os exercícios Python exportados por validate-content.mjs.

Para cada exercício: setup + solução + testes precisa passar,
e setup + código inicial + testes precisa FALHAR.
"""
import contextlib
import io
import json
import os
import sys
import traceback

os.environ["MPLBACKEND"] = "Agg"
here = os.path.dirname(os.path.abspath(__file__))
steps = json.load(open(os.path.join(here, ".python-steps.json"), encoding="utf-8"))
errors = []
import tempfile
os.chdir(tempfile.mkdtemp())  # exemplos que gravam arquivos não sujam o repositório


def run(step, code):
    ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(step["setup"] or "", ns)
        exec(code, ns)
        exec(step["tests"], ns)


for step in steps:
    try:
        run(step, step["solution"])
    except Exception:
        errors.append(f"{step['where']}: solução falhou\n{traceback.format_exc(limit=2)}")
    if step["starter"] is None:  # exemplo resolvido: só precisa rodar
        pass
    else:
      try:
        run(step, step["starter"] or "")
        errors.append(f"{step['where']}: o código inicial já passa nos testes")
      except Exception:
        pass
    try:
        import matplotlib.pyplot as plt
        plt.close("all")
    except ImportError:
        pass

print(f"Exercícios Python verificados: {len(steps)}")
if errors:
    print(f"\n❌ {len(errors)} problema(s):")
    for e in errors:
        print("-", e)
    sys.exit(1)
print("✅ Exercícios Python OK")
