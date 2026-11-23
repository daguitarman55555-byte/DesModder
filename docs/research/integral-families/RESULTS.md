# Integral families: what the current engine does

Run 2026-11-23 by `bench.cjs` on Physics Lab's integrator (through the Calculus tab mock-up engine). 84 cases from the families in GUIDE.md.

Results: pass 64, series only 4, miss 5, timeout 1, numeric 9, WRONG 1.

- **pass**: closed form whose derivative matched, the expected series, or a proved definite value.
- **numeric**: right definite value, but found by quadrature, not proved.
- **series only**: an elementary antiderivative exists, but only a series came back.
- **CHECK FAILED**: a formula came back whose derivative did not match at the sample points (wrong, or right only on part of the domain).
- **WRONG**: a definite value that disagrees with the known one.
- **miss**: nothing decided.

| Family | Case | Result | Answer | ms |
|---|---|---|---|---|
| F01 | power sum | pass | `x^{3}-2\operatorname{ln}\left\|x\right\|+\frac{2x^{\frac{3}{2}}}{3}+C` | 6 |
| F01 | binomial cube | pass | `\frac{\left(2x+1\right)^{4}}{8}+C` | 6 |
| F01 | over a monomial | pass | `\frac{x^{2}}{2}-\frac{1}{x}+C` | 2 |
| F02 | affine exponential | pass | `\frac{e^{3x+1}}{3}+C` | 1 |
| F02 | base 2 | pass | `\frac{2^{x}}{\operatorname{ln}\left(2\right)}+C` | 0 |
| F02 | secant | pass | `\operatorname{ln}\left\|\operatorname{sec}\left(x\right)+\operatorname{tan}\left(x\right)\r` | 1 |
| F02 | cosecant | pass | `-\operatorname{ln}\left\|\operatorname{csc}\left(x\right)+\operatorname{cot}\left(x\right)\` | 0 |
| F02 | tan of 2x | pass | `-\frac{\operatorname{ln}\left\|\operatorname{cos}\left(2x\right)\right\|}{2}+C` | 0 |
| F03 | sin cos | pass | `\frac{\left(\operatorname{sin}\left(x\right)\right)^{2}}{2}+C` | 1 |
| F03 | #31 \|e^x-3\| | series only | `2x-\frac{x^{2}}{2}-\frac{x^{3}}{6}-\frac{x^{4}}{24}+C` | 32 |
| F03 | #52 root of a square | series only | `2x+x^{2}+\frac{2x^{3}}{3}+\frac{x^{4}}{3}+C` | 56 |
| F03 | four-factor square | series only | `x+\frac{3x^{2}}{2}+\frac{x^{3}}{3}+C` | 4 |
| F04 | x e^{x^2} | pass | `\frac{e^{x^{2}}}{2}+C` | 1 |
| F04 | cot as a quotient | pass | `\operatorname{ln}\left\|\operatorname{sin}\left(x\right)\right\|+C` | 1 |
| F04 | e^{√x}/√x | pass | `2e^{\sqrt{x}}+C` | 1 |
| F04 | ln x / x | pass | `\frac{\left(\operatorname{ln}\left(x\right)\right)^{2}}{2}+C` | 0 |
| F04 | #386 chain-rule square | pass | `\frac{\left(1-\operatorname{cos}\left(2x\right)\right)^{2}}{2}+C` | 1 |
| F05 | x^5 √(x^3+1) | pass | `\frac{2x^{3}\left(x^{3}+1\right)^{\frac{3}{2}}}{9}-\frac{4\left(x^{3}+1\right)^{\frac{5}{2` | 2 |
| F05 | x^3 √(x^2+1) | pass | `\frac{x^{2}\left(x^{2}+1\right)^{\frac{3}{2}}}{3}-\frac{2\left(x^{2}+1\right)^{\frac{5}{2}` | 1 |
| F05 | x/√(2x+1) | pass | `\frac{\left(2x+1\right)^{\frac{3}{2}}}{6}-\frac{\sqrt{2x+1}}{2}+C` | 1 |
| F05 | #420 with n=3 | pass | `\frac{x^{3}}{3}-\frac{\operatorname{ln}\left\|x^{3}+1\right\|}{3}+C` | 4 |
| F06 | D>0 arctan | pass | `\frac{\operatorname{arctan}\left(\frac{x+2}{3}\right)}{3}+C` | 1 |
| F06 | D<0 log | pass | `\operatorname{ln}\left\|\frac{x-3}{x-2}\right\|+C` | 2 |
| F06 | linear over quadratic | pass | `\frac{3\operatorname{ln}\left\|x^{2}+2x+5\right\|}{2}-\frac{\operatorname{arctan}\left(\frac` | 2 |
| F06 | D=0 | pass | `-\frac{1}{x+1}+C` | 1 |
| F07 | 1/√(4-x^2) | pass | `\operatorname{arcsin}\left(\frac{x}{2}\right)+C` | 1 |
| F07 | √(x^2+9) | pass | `\frac{\sqrt{x^{2}+9}x}{2}+\frac{9\operatorname{ln}\left\|\frac{x}{3}+\frac{\sqrt{x^{2}+9}}{` | 1 |
| F07 | √(9-x^2) | pass | `\frac{x\sqrt{9-x^{2}}}{2}+\frac{9\operatorname{arcsin}\left(\frac{x}{3}\right)}{2}+C` | 1 |
| F07 | completed square | pass | `\operatorname{arcsinh}\left(\frac{x+1}{2}\right)+C` | 1 |
| F07 | split numerator | pass | `-\operatorname{ln}\left\|\operatorname{tan}\left(\frac{\operatorname{arctan}\left(\frac{x}{` | 9 |
| F08 | distinct roots | pass | `\frac{\operatorname{ln}\left\|x+1\right\|}{2}-\operatorname{ln}\left\|x\right\|+\frac{\operato` | 1 |
| F08 | division first | pass | `\frac{x^{3}}{3}+x+\frac{\operatorname{ln}\left\|\frac{x-1}{x+1}\right\|}{2}+C` | 1 |
| F08 | repeated quadratic | pass | `\frac{x}{2\left(x^{2}+1\right)}+\frac{\operatorname{arctan}\left(x\right)}{2}+C` | 2 |
| F08 | x^4+1 | pass | `\frac{\sqrt{2}\operatorname{ln}\left\|x^{2}+\sqrt{2}x+1\right\|}{8}+\frac{\sqrt{2}\operatorn` | 3 |
| F08 | #405 x^5+1 | pass | `\frac{\operatorname{ln}\left\|x+1\right\|}{5}+\left(\frac{\sqrt{5}}{20}-\frac{1}{20}\right)\` | 7 |
| F09 | #347 (x-1)^2(x+1)^5 | pass | `-\frac{5\operatorname{ln}\left\|x-1\right\|}{64}-\frac{1}{32\left(x-1\right)}+\frac{5\operat` | 3 |
| F10 | x^3 e^{2x} | pass | `\frac{e^{2x}\left(4x^{3}-6x^{2}+6x-3\right)}{8}+C` | 2 |
| F10 | e^x cos 2x | pass | `\frac{e^{x}\left(\operatorname{cos}\left(2x\right)+2\operatorname{sin}\left(2x\right)\righ` | 1 |
| F10 | x^2 sin x | pass | `2x\operatorname{sin}\left(x\right)-x^{2}\operatorname{cos}\left(x\right)+2\operatorname{co` | 1 |
| F10 | x e^x sin x | pass | `\frac{e^{x}\left(x\operatorname{sin}\left(x\right)+\left(1-x\right)\operatorname{cos}\left` | 1 |
| F11 | x^2 ln x | pass | `\frac{\operatorname{ln}\left(x\right)x^{3}}{3}-\frac{x^{3}}{9}+C` | 1 |
| F11 | (ln x)^2 | pass | `x\left(\operatorname{ln}\left(x\right)\right)^{2}-2\left(x\operatorname{ln}\left(x\right)-` | 1 |
| F11 | x ln(x^2+1) | pass | `\frac{\left(x^{2}+1\right)\operatorname{ln}\left(x^{2}+1\right)-x^{2}-1}{2}+C` | 1 |
| F12 | arctan | pass | `x\operatorname{arctan}\left(x\right)-\frac{\operatorname{ln}\left(x^{2}+1\right)}{2}+C` | 0 |
| F12 | x arctan | pass | `\frac{\operatorname{arctan}\left(x\right)x^{2}}{2}-\frac{x}{2}+\frac{\operatorname{arctan}` | 0 |
| F12 | arcsin | pass | `x\operatorname{arcsin}\left(x\right)+\sqrt{1-x^{2}}+C` | 0 |
| F13 | sin^3 cos^2 | pass | `\frac{\left(\operatorname{cos}\left(x\right)\right)^{5}}{5}-\frac{\left(\operatorname{cos}` | 1 |
| F13 | sin^2 cos^2 | pass | `\frac{x}{8}-\frac{\operatorname{sin}\left(4x\right)}{32}+C` | 0 |
| F13 | cos^5 | pass | `\operatorname{sin}\left(x\right)-\frac{2\left(\operatorname{sin}\left(x\right)\right)^{3}}` | 1 |
| F14 | tan^3 | pass | `\frac{\left(\operatorname{tan}\left(x\right)\right)^{2}}{2}+\operatorname{ln}\left\|\operat` | 1 |
| F14 | sec^3 | pass | `\frac{\operatorname{sec}\left(x\right)\operatorname{tan}\left(x\right)+\operatorname{ln}\l` | 0 |
| F14 | sec^4 tan | pass | `\frac{\left(\operatorname{sec}\left(x\right)\right)^{4}}{4}+C` | 0 |
| F14 | √tan | pass | `\frac{\sqrt{2}\operatorname{arctan}\left(\sqrt{2}\sqrt{\operatorname{tan}\left(x\right)}+1` | 2 |
| F15 | sin 3x cos 5x | pass | `\frac{\operatorname{cos}\left(-2x\right)}{4}-\frac{\operatorname{cos}\left(8x\right)}{16}+` | 1 |
| F15 | 1/(2+cos) | pass | `\frac{2\operatorname{arctan}\left(\frac{\operatorname{tan}\left(\frac{x}{2}\right)}{\sqrt{` | 1 |
| F15 | 1/(1+sin) | pass | `-\frac{2}{\operatorname{tan}\left(\frac{x}{2}\right)+1}+C` | 0 |
| F16 | 1/(x√(x^2-1)) | pass | `\operatorname{arccos}\left(\frac{1}{x}\right)+C` | 2 |
| F16 | conjugate | miss | Only a denominator that is linear in the variable can be integrated here. | 3 |
| F16 | #242 reciprocal quartic | series only | `\frac{2x^{3}}{3}-x-\frac{3x^{5}}{10}+C` | 9 |
| F17 | \|x^2-3x+2\| on [0,3] | timeout | over 20 s | 20000 |
| F17 | #258 ln(1+tan) | numeric | `0.27219826128795` ≈ 0.27219826128795 | 122 |
| F17 | odd x^3 cos x | pass | `3\operatorname{cos}\left(-1\right)+-\left(3\operatorname{cos}\left(1\right)\right)+-\left(` ≈ 0 | 9 |
| F17 | #409 odd radical | numeric | `0` ≈ 0 | 2 |
| F18 | #329 cos/(6^x+1) | numeric | `\frac{\sqrt{2}}{2}` ≈ 0.707106781186548 | 24 |
| F18 | sin^3/(sin^3+cos^3) | numeric | `\frac{\pi}{4}` ≈ 0.785398163397448 | 184 |
| F19 | Wallis sin^6 | pass | `\frac{5\pi}{32}` ≈ 0.490873852123405 | 4 |
| F19 | ln sin | WRONG | `NaN` ≈ NaN | 9 |
| F19 | #414 quadratic-trig | pass | `\frac{2\operatorname{arctan}\left(\left(2+\sqrt{3}\right)\operatorname{tan}\left(\frac{\pi` ≈ 0.523598775598299 | 241 |
| F20 | 1/(e^x+1) | pass | `x-\operatorname{ln}\left\|e^{x}+1\right\|+C` | 1 |
| F20 | e^x/(e^{2x}+1) | pass | `\operatorname{arctan}\left(e^{x}\right)+C` | 1 |
| F20 | x sin^2(ln x) | pass | `\frac{1}{8}` ≈ 0.125 | 30 |
| F21 | e^x(sin+cos) | pass | `e^{x}\operatorname{sin}\left(x\right)+C` | 1 |
| F21 | #393 e^x(1-sin)/(1-cos) | numeric | `e^{\frac{\pi}{2}}` ≈ 4.81047738096535 | 57 |
| F22 | #417 (x^2-x)/ln x | numeric | `0.405465108108164` ≈ 0.405465108108164 | 45 |
| F22 | #423 arctan difference | miss | A quotient with the variable above and below the line needs a substitution or partial fractions, which this does not do. An infinite bound needs a proof this mock-up does not attempt numerically. | 2 |
| F22 | #424 ln x/(x^2+1) | miss | A quotient with the variable above and below the line needs a substitution or partial fractions, which this does not do. An infinite bound needs a proof this mock-up does not attempt numerically. | 1 |
| F22 | #425 damped sine | miss | A quotient with the variable above and below the line needs a substitution or partial fractions, which this does not do. An infinite bound needs a proof this mock-up does not attempt numerically. | 1 |
| F22 | #426 ln(2+cos) | numeric | `1.95975916376247` ≈ 1.95975916376247 | 51 |
| F23 | Si | pass | `x-\frac{x^{3}}{18}+\frac{x^{5}}{600}-\frac{x^{7}}{35280}+C` | 2 |
| F23 | #297 (cos x^3 - 4)/x^2 | pass | `\frac{3}{x}-\frac{x^{5}}{10}+C` | 7 |
| F23 | (e^x-1)/x on [0,1] | numeric | `1.3179021514544` ≈ 1.3179021514544 | 36 |
| F24 | ln(1+x)/x | pass | `x-\frac{x^{2}}{4}+\frac{x^{3}}{9}-\frac{x^{4}}{16}+C` | 2 |
| F24 | ln(1+e^{-x}) on [0,∞) | miss | ln of something that is not linear in the variable cannot be integrated here. An infinite bound needs a proof this mock-up does not attempt numerically. | 5 |
| F24 | arctan x / x on [0,1] | numeric | `0.915965594177219` ≈ 0.915965594177219 | 50 |
