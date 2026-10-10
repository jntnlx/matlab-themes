# Shared code samples, tokenised by hand: (class, text). Classes: k c s i d (docstring) n (plain)
MATLAB = [
 [("c","%% Estimate a damped oscillator from noisy samples")],
 [("k","function"),("n"," [f, zeta] = fitDamped(t, y, opts)")],
 [("k","arguments")],
 [("n","    t (:,1) double")],
 [("n","    opts.Plot (1,1) logical = "),("n","false")],
 [("k","end")],
 [("n","Y = fft(y - mean(y));   "),("c","% remove DC before the FFT")],
 [("n","[~, idx] = max(abs(Y(2:"),("k","end"),("n","/2)));")],
 [("k","if"),("n"," opts.Plot && numel(t) > 1e3")],
 [("n","    title("),("s","'Spectrum (n = %d)'"),("n",", numel(t));")],
 [("k","else")],
 [("n","    warning("),("i","'fitDamped:short"),("n",");")],
 [("k","end")],
 [("k","end")],
]
PYTHON = [
 [("k","def"),("n"," fit_damped(t: np.ndarray, y, *, plot=False):")],
 [("d",'    """Estimate frequency and damping ratio."""')],
 [("n","    Y = np.fft.rfft(y - y.mean())  "),("c","# drop DC")],
 [("k","    if"),("n"," plot "),("k","and"),("n"," len(t) > 1_000:")],
 [("n","        ax.set_title("),("s",'f"n = {len(t)}"'),("n",")")],
 [("k","    return"),("n"," f0 @ W, zeta")],
]
