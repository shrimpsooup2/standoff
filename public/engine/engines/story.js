// A scene with no decision in it: somebody reads, everybody listens.
// Effects can still happen — a story beat can move money, heat or the case.

export default {
  kicker: null,
  private: () => false,
  start(g, b, def) {
    const c = g.ctx();
    def.run?.(c);
    b.data = { story: true };
    g.toFallout();
    g.clockFor('story');
  },
  pending: () => [],
  step() {},
  view: () => ({}),
};
