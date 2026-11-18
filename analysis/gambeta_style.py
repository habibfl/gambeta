"""Charte graphique des figures Gambeta (matplotlib)."""

import matplotlib as mpl
import matplotlib.pyplot as plt

CORAL = "#e86f2c"
INK = "#221400"
MUTED = "#8a8278"
GRID = "#e7e3dc"
SURFACE = "#fcfcfb"
CORAL_LIGHT = "#f4c3a4"

# Une couleur fixe par championnat (validée : séparation daltonisme OK sur les paires adjacentes).
LEAGUE_COLORS = {
    "Premier League": "#2a78d6",
    "Liga": "#eb6834",
    "Serie A": "#1baf7a",
    "Bundesliga": "#eda100",
    "Ligue 1": "#e87ba4",
}

SOURCE = "Source : FBref / Understat, collecte Gambeta"


def apply():
    mpl.rcParams.update(
        {
            "figure.facecolor": SURFACE,
            "axes.facecolor": SURFACE,
            "savefig.facecolor": SURFACE,
            "font.family": ["Inter", "DejaVu Sans"],
            "font.size": 11,
            "axes.edgecolor": GRID,
            "axes.labelcolor": MUTED,
            "axes.titlesize": 15,
            "axes.titleweight": "bold",
            "axes.titlecolor": INK,
            "axes.titlelocation": "left",
            "axes.titlepad": 30,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.grid": True,
            "grid.color": GRID,
            "grid.linewidth": 0.8,
            "xtick.color": MUTED,
            "ytick.color": MUTED,
            "xtick.major.size": 0,
            "ytick.major.size": 0,
            "legend.frameon": False,
            "figure.dpi": 110,
            "savefig.dpi": 160,
            "savefig.bbox": "tight",
        }
    )


def subtitle(ax, text):
    """Sous-titre gris sous le titre (la question à laquelle répond le graphique)."""
    ax.text(0, 1.02, text, transform=ax.transAxes, color=MUTED, fontsize=10.5, va="bottom")


def source(fig, text=SOURCE, y=-0.02):
    fig.text(0.01, y, text, color=MUTED, fontsize=8.5, ha="left", va="top")


def save(fig, name, folder="figures"):
    from pathlib import Path

    Path(folder).mkdir(exist_ok=True)
    fig.savefig(f"{folder}/{name}.png")
