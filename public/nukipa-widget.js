/*
 * Nukipa feedback widget. Floats bottom-right of the deployed site so
 * tenants can leave inline feedback during the design-review loop.
 *
 * No backend round-trip. Items accumulate in localStorage; the tenant
 * presses "Copy all" to get a markdown summary they paste into their
 * Claude Code conversation. A beforeunload guard warns if there's
 * unsent feedback (typed-but-not-saved, or saved-but-not-copied).
 *
 * Why vanilla JS in /public, not a React component:
 *   - The site is rewritten by an LLM during the design-review loop.
 *     Anything inside the React tree can be unintentionally restyled
 *     or deleted. This file is loaded via a plain <script> tag, runs
 *     outside React, and re-mounts itself if anything removes its
 *     host element.
 *   - Shadow DOM with `all: initial` isolates every style from the
 *     site's Tailwind / globals.css.
 *
 * Configuration (via data-* attributes on the <script> tag):
 *   data-tenant  tenant host (included in the copied markdown header)
 *   data-label   bubble label (default: "Feedback")
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.__NUKIPA_FEEDBACK_MOUNTED__) return;
  window.__NUKIPA_FEEDBACK_MOUNTED__ = true;

  var script  = document.currentScript;
  var tenant  = script && script.dataset.tenant || '';
  var label   = script && script.dataset.label  || 'Feedback';

  var HOST_ID     = '__nukipa-feedback__';
  var STORAGE_KEY = 'nukipa_feedback_v1';

  // Embedded Nukipa logo so the widget is self-contained. If the
  // agent's brand-asset overwrite of /public/ ever clobbers a separate
  // logo file, this still works.
  var NUKIPA_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARMAAAETCAYAAAAVqeK4AABcPklEQVR4Ae29aZRcx5UeeG+8l1vtVagqoLADBEES4A5QJLgWVwlqS/b0MXhmzplpW9PTotuyZEtju33sHyp6jueMu/t0t6V29yHGtjQzHnua6LZnmi2xBXEpLiC4gQtIQNh3oIAqoPaq3N6LO999WQABYisAVbnGRyYy82VW5st4EV/c+90bN4gcHBwcHBwcHBwcHByqCkwO1Q8RlqmHzz9P3Eu9hh7rpoE3yCyop9iEJRPrJI9y5Ot78E+dJYpd/EFZCkzCikfjkqFAj6RHyc5vpXzwOYUNj1CwegMJPU/U80PcR73r3Fc7VDkcmVQNhHt6iHesiq6pN5KhWDhKybxQE543YOR3GA6bWXiuMLUzUyORaWWSOegGMSFpwrCv1y4BImlgkRgentc/ph7iTSKUNgzq0W8V3DOdEZFxvGMUt3EhcwL3/WCRYd+nQ2GWJm2MTocZynz1+5T9oZ4sO5KpNjgyqUTA0ujBtduxifzxk5RMEzWFPrURB13G+otDsYuN0GJi7sKInYth20iGGzHg4/jjJIaymSIKc96n3kBfkPP/HPyCb9B7oRCklcXLeZDQSRDIsFjZS545zhLuNKG333p0fMKnM8tbKbtpA3jMkUzFwpFJ2aNgcbzURR4GXOLUAMGaoHkYqMtACSus2JvxluV44zwM2lZc0Xrcx3FfIAwpy2scEYYSDX7HGB4dJLJ7ccqfhULbYSZ9lp1HZ766gbI9zJYcKgKOTMoQmNL58V7yUp9R3Ugi2+HlvaXE/m24WKsx+G4FQyzEvboqKSsU44KVUQ3XUkkmxA0EQ3vwOz8VMW/ZkD7IpOjoN/oo09PjyKVc4cikHADy2LCJTGaIEmNZuCseLQ3Z3g6D/y68dAcu0mIYGK2RiwI9hGrruqnLNAmW2Q83aSuevwXf7L2VPh3e+G2IwM4tKhs4MikR1Pp4HtZH7yfUQHU0L7B0G4d2LYyMuzFAVlqRTgyTOlyhWiOPKyLSY4RG4OJ9Zi2/Zpl+0ZCm7Zv/MU06YiktXCctIpRA1m4kf14DNYwO0CL26HZie78VvgdXYjkuRhtGQwLmvXGXZlpQqyWLptqH9vpruH5/nWqidzf/D45YSgHXY2cbUy7M0IGhhlxj63wcuRPT6wOIbqxB578Jz9twQ5TlgsiKw/Uhj7Y9BHfov1AQ/Dxv/Q+2fp8yjliKA0cms4SeHjGIwCQbbaYzsMlbceh+FlmHXq1Cajueq/7hCGSWAFE6g7b+DG3+FyZp/qKjiQ5uepZDcpg1ODKZScAK6X6evKCTGhFzWEZivwI7/BGEPCGkyiLMmHUIgfqu2YsKwX8joO03ECv/98E49W75pzTurJWZh+vVM4GCKxM7cYrafabVVuwj6KwPoRPfhhlSdRB1Y1xblxqMsLPQPhb+d7GQ/q9X/iH1u0zcmYPr4DcAFVSf/UNKDiapKyd0L1v7OEK469Cqy9C0DXiHTw7lCaE+MvILCs3vzZtHu50LdONwZHIdUD3knXpKTdTTQs+GD4BAnsTtK3hpETstpNKga4xeQpj53zw9SFtcUtz1w5HJNSAikeUgkVFaCrZYZ8g+acnch2luAV5OkGvPSkaAy/c2NK5//dQAbXakcu1wnX8aUBLp1WX5C2gRZcN18G6eIcP3wVSejxZMlOn6F4frQ4iQ/QfQvP7V29+hnzmhdvpwg+AKUE3kmxspNR7SokBoHYt9CrwBSwSkUnBnXPtVLyxIZYvl8Hfe+QexreRwVbjBcCmARNb/mOITWZovdbQG/eoZNNXD6FxL0GApcu1WM8CFnhDDLwYh/e7W7/Iucrgs3KC4AMLdPeRRHbXbZrqT8vYZTR1B+HCFkDSSE1ZrGWOwVP/UN+Z/6f0Oj5PDRXBkMgXVRd5OUmO+kVaGYp9gMk/DQrkTL2mNEBfidYgAgfa4Z/lfIvD/f/Z+izPkcA6OTApZqwnqoIVW6CF0lq/i4DqyEFcNxZy46nBp8F94HvX0/jZ/Tg4RanqgbHhRvJMnqU18uous/RoOPcnEK3BfT45oHaYD5t9NNdK/3PwbPEE1jtocMLBG1m2ipOmn5R5RN7GsR/zvXlgjHc6lcbgO7CcJ/85b341toRpGzZGJWiNHTlB7LEb3sLW/hpnlcbgyy9ESLtTrcCMIIdT/kWX6V2//fR6iGkTNDB7NGfnWTymxfyy3nEz8MRz4NWZaK4VyAB45OMwMdrLH333zt/k1qjHUBJn0aFXif0utAdOdmDnWg0iewk+/GRRT7wRWh5kHojyGfjfI0P+29QecphpBlQ8k4W9/SP6eD2hBGIQPwwz9BrjjAbzQRZfcsc7BYUbxJvv8P73593gv1QCql0wKId/67Fy6OW7t05b469BH7iArLeSSzxyKhzOYwH7rqe/Q/1ftewBVJZmoW9O7kdqCLN3Nnv06Cz8FbQQhX0k5jdWhFGCSHz1x2vzPPT0cUJWi6kZW9+vi251wY2z4ILH3TZDIQyR2AawSF/J1KDXe8yz/7d7v8TGqQlQPmUxlstoOWsZkH7fC3wCB3Msic8RFaxzKBwcpDH/rrX8Ye5WqDFVBJhr2ffh3qcFvoFstaSar+RoO3o6XdHGe82scyg26r8/vvPUd/mOqIlT8QNMFeq90UrMnwd2QSn4NYtfTOHyz00ccyh2G+F+88Q/4f6UqQUXrCEokL7dQR8zSfVbMN5mNJqMtBYfEHZE4lDuE7VyqIlQsmWhafO9J6kp4KrAShFYtXiTz3doah0qBiP1LqiJUZL7FmhckdvgULbaGnhQr/60wPQ4SWeCIxKFSALt5/Mnv+K9TFaHiyAQWSbw+Q0tTZJ8WlmdxVR6CRaLmoovYOFQMEGF8s9qS2CpqJu/+iSRPDdAy8elJhH6/yUL3guNbmcRltDpUEAR6ifkzqjJUDJkokfAE3QSX5hmQxzdgkdyNa9ISFdJzcKgocCYeUtXVPqkAMhHu/gklKJNbkSf/GRb+hgiIhKmZXMjGoTKxZ+RzOkJVhjJ3D4TX/QElKUMrQht/2jD/DRy8yxGJQyWDmX++bSPnqcpQxmQSbTuRiMVyIBJ6mkUKFgmpa+OIxKFiERqmqkulV5SpmyO8/kcUH/Jyy2LW7waR/JoIT1kkTiNxqGgcpyx9SFWIsrRMNvRQbMzQkjjFH2XD60EiIBKtQ+KiNg6VDUyMb3eP0ChVIcrOMtGEtMGQFhpLD2udVhy6FzH5NnIFjRwqH5aM+UVPT3UWSSqrAaop8qkMdeWDcB0i8V8X4jVUKPjsiMSh8iE0TB5V7SboZTNItTraySHqpDitEZ+/ikNr0fpzXS0ShyrCZ7eupUNUpSgLMtHVv1pmUYLgLhiAz0Bj1aLP88kRiUO1AKFI/PfLjWurLyR8FiUnEy1s9HYXNdo8rTJinsKBh3B4Ebnq8Q7VBOa0eKYqQ8JnUVoyAZF89fepLhPSCrgz3dBIHmHiZaDwJDk4VBGYaX8sS7uoilFSMln/Y4pn6mixZ+khJukGiawUlnpycKgqCFmRN7r/UXWGhM+iZGTS3SN+OtTNsML7rJHHEStbRUxNboc9h6oDc55FXqn2fXNKQiYquFIHtdtEeCcLP47o+91gkDnkQsAO1QihE57x3qUqR/EHrwquq6gxsMGtEvBjwmYtmHseVXg9WgeHK+CDsU/pDFU5ihx6FV7DlEKYBoKreZwNPQHhdSWY2+kkDtUJyCVk7R+9+6+8qlyPcz6KapmseYH8lk6aB8dxDbE8hND7zY5IHKoaTCNM3htURKz/kTRRCVA0MlGdxDfUlg/pdhH7MAsEV6JWcjqJQxVDmD4xTXSUioR1fzDSNu7Rf1rzgtRRkVGcgQyd5JeLqD6eoRXW0DpmczfcG6eTOFQ7EGngzb3foiwVCbFEUzfG29frc/R9KjKKQCbCmk9iJmgRWHoNLJKvCMkSmH8uMc2husE8bpl+qYUHqAjQbHIr9m/pN1sj//zBf5u7m4qIWSeTDS+SGY5RO8TW25ksrJJIJ3H5JA5VD2NlT9qjfVQkPP5H1BylWlBEX3W+xP73Yro7s0smYMqhIWrw8wGiN/Z+/MQ7YJV0kFvA51D9EDH8+rZv0xgVCfkY3YcpuuvcCZCsrcvT71BPcYqKzeqXqHuTFVpAxtzDzPfg0AL8wgQ5OFQ/0uzRZipW1ismbk+sFhP78kT9g8fbQTJFwKyRidYnGWWaQyGtgj9zH0hkBe4byRWDdqgNHLJx+oSKhG9spJRlfuriV6QhJPlj3XeKZhmzQyYavfkPVI8PXwbmWAN5ZDUUqHZX6MihRgAPQ970jtAQFQkjGbqbNW/rkidDa+24/Wc6LmkWMStksvp5inE6C9/N3gGF+R78goU47Nwbh1oBQsHmld4eDqgoEBbPfhU2f/yyb2H+Rw/9Ka2kWcSMk4kmp7UtpmZDiRXQSu6lKHWemsglpznUCDB5HpM4fUBFQrTjJfHXrvQejMFmz8rvrf+RzNqkPsMDXPilLkryeH4h9OO70KircXAujruqaQ61AjgT8m5XK52kIiEcyen6ttVXex8I5WtjHH6TZgkzSiaaU9KYpTYxsVvE6u57sgSEknKaq0OtgNXFCc2rm56lItV6FTYx/2twY1LTeHPMkNfz5B/LHJoFzByZgI+PnKR669FifOqdhmWlCIjFia4OtYU+WOXvFCvrVXe+FKt7cE8vl0SM3JYX+q3ZEGNnjEzWbCS/wad2suFtZAXCa1Rd3omuDrUEsUIfpmN0jIqEYaZlMIfunPYfILQKN+y73X9CN9EMY2bIBCyXCqkhz7SUDN8BVl6Oo83kRFeHGgJMkTwzv76tjzJUJMSMfUwK+VvXgvmh2B/MdGbsjHzY+h/vi/thbi6FdJsVXoVmnQdCcaKrQ00BfsMp9Pq3qUjbf377BYmJGF3Yd83jGKT33z/SSbfTDOKGyURDwenEisbQjy8RsbejQZfgcIPbZNyhxiCGaVs4XLwd+3YZzd+S++k6ABmika39F7olL80QbnjA9y6hOOcR/g3tbfB2bsEhXcjnrBKHWkPOhvLq02maoCJBcvQYFeSE6/t7Mn/jVB9dFxldCjdEJmqVhGNaHDpcSpZWG8O6Ex+sEhcLdqgtoMMPcMxs6SmSi9P9uvgIdPxNuqExLHWI7vxzdZdoBnBDZKJWiW+okzxeCeF1hZC0o1Vd9TSH2kK0jzB9ks3TfioWdsHFYXqQbhAIED+9Nxvc8OcorptMor1vclEEZ5GI3Mokuv6mzhU9cqg9cA6C5ivrv0vjVBQguBuEWgSpnW4QGKzxgM1vf/vbN26dXDeZvNdGMRvkOnAyK5jNcuglbTg1Z5U41Bwwuw+ElrYUa8e+Nd8mX9isp5lKvWBev3tV/oZLPF7fyYA5huuo3nB8AZ7dwkILmXXLChfBcag5aCrpx7GG4pVnrL+L5s2Ei3MemsTzntMaRHQDuK4/1hIDsQmaYwN7E1u5aapWiYvgONQcQCQ58MmrHfXFKs8omLfDhyHTdNIMAp/6670bb6xEwbWTCaySjmZoIx51gZJXoDU11t1ALtvVoQaBSfRUGIRbNj3LIRUBG3oohiGo5RlnevJuDQP7mz03kBV7zX+oa3Bw10IIB7Ph5WhM6CYu29WhJhG5OCYeK5qLM9BM84XMOpoFsPDf7u24fovn2sgElNgYUCL0qNN63nLQ8iKcQgMCY25lsEPNAa5GBpHMV/3+Irk4GH+BHz6IyOkCmh3o3lbXXe/kmshkw7NkQp8a2YPgKlatkk78wKTLUXOoRUC8OGEp3Fqs8ozdP6UEe97X5ErlGW8AWi4E5Ph3nvk9ua79v6+BTIQHvk4xz0J41dXBFGW7NoNHnFXiUIvQMPDHNhU7QEVCkKb5FMqDs5nLBWvrnmxd8BW6DkybTPAlNDlB9RIGXbBKtIbCXIqqqDmzxKEmMUmGX00co1EqBuDiYLA+gNE2Wy7OWaSsmN+4njDxtP9gLYRX32ZbRC0S4cW4tbJLnXeoSUihaLShork4fxcuDr72q1SMgmPCX33tT66dtKZHJmDF5DAljTHtaMYliN7M03AwrBXn4jjUHphDZv7QT9NhKhL25HRwi0ZxZt0TgAnUKWH4tWv9u2mRyYZNZGINVM8UA4lEa3G0zIAryehQk2Ch8dCGr3UsKF4Ux+TDBzF5L6QiIDIS2PztDS/KNQm90yKTgZ0Ug9zUwmTxY8x8+IpaJs5ZJQ61BxUPmQ9wzHuvWIlquvUna6Ia06xv8XkOTA8MDNCqa/mTq5IJrBAe64IVYqgdbLWQjWg4uI5cxuu1QzuiREXLZepm8W/hVogOFI7L2Zcdyg7MeVyad7w2OkJFwmQW0VPm+4u8Ir8xZLv+Wv7gqoTwLFycZI7qKaR56OMLJJQ2dPZZiXNXH6aIo0AWOXSING6j6BGD6BYncfwEjh9Fe2o18+N4rhs3ncF7RtBrJ/E8h/eGdI5gHEoOoWH8+2bvBkRzioCenh6T80Nd1DePigtmy79+LTsAXiUaIzwwQTEToxbJUxeTzMOoaIT45KySK6NgdRDn8AgEEvnWw8I8aEiGYO2NwO8eA5UrYQRiDOYc65E1SbiS9eCNJjasOTwgbmqJbsyaSKRmrl/I4nYR+RJAbYPdhukjKlK5gXfqf5jCtz6Fry76BI5OvDrt0W14+Ml03u9f7dOG/4iSDXW6S5+dD0OmHZGchCs1cFkoiQQY5pMY7mfw+CSzHBUyhyW0x43hk+iNZxAKGAWRpP0cZW0ssjzIBgZuMcU8MQnPUB1T0GyJ51jjzWVrF4HAEY6nhSCaeejISjB1UwmDjlWKBF0hbEXeGWziPioScg20jEJ5gEojK6SskG7w9el0NhW7Ipl0P05e+N9B/AlC6CTchQ9twWHn4lwE1UI4UBcGT06i3fej8X+FzrcHktMhNPJJn81QPk+TY3WUW95KAURt27HqYmFkoIO4Y4DMgZ2+39pFsTRcTBbTErmZ8XAxPvdm9KuVZOQmzI0Qw6kZBKOmqCOVWQau5SkEH17ffgDWZhGgK3hft/QoLuy8Ujm58K+/1v0T/v3eb119L6Arkknq18kbzuWaPePPM2w6YZ43MKMbO/f9fEBA5TTapQ8NvwtE8rFY8ylshr1wXvrjTTS2NE25jX2ggx4lD5Zt0/vcXPSvyChC86eOHaODoUx+WseNrdYGi5n8WyzbO/DdqzFnLAeVzJGCG+RIZXYAI5G2Y8r4vFj74rzcNtiQsK1fna21ONPEXeEY6aZ6O6/2xsuTCWh48HlK+G1xDQlDfBWtN5kSF8WZwllrJBJT9+HJhyDcd8Xy56kUHW9qovFNOymg79xgx4OftKkgwmI2lAy+dqj7p/4xb4R25BP4PqJbKLRr8b572crNOBdNLHSWykyDaUIsvc2NdJqKBBNru0kCuZdKeS2Z6rXoNN0ImegK4eNPUBKz6xyY2Z3Con56zBWMjqAWRhYtccIwbxdrtyBs/r66NZ1zaXDTBsorCdCMg7X1pZfU5JTsmhe2DabCNYdCz3zuh/Q+TPD7QPpr8dpKaCxzxEKJZ3e5bhhRSJ+PYhp9q/fvUpa+RbMO3Ryrv98+ZZlntKLaNUM0IVaeWPOC/Mm25xAWvwIuSyY7V5PXKtSAD+tAY+IHcT3rEmWX/6BRmnG08mEM2PclpDc9Y7blUnTkiaM00fOd4pjAkbv0HOnFHerukbGgk47bPO2M+fwRhNsHQSr34fy0pGYruQTDG4PmlhB/gGu9d3YmiYsxOkoqwD+JySNW6iEHLr0vmYs21ztxpfddhkyEk13k24CaEK/sBDnNiTbscS5OCEIdxjjeCy/wHVzoNxA2357MU9/rv8nZLVQaTC02i0jFa6e+jNBez/DnIvYRXLs1rEWsOFrh7VzU68MQ4pdvDJ2mESoG0Lkyf0qqhd0tZeCu4re3GwnuoKuQySU7V08PcXwCLo4lRG+MMlILFUSgWu6MCPnyAO4/tVZ+wR79DC7g+2OGjr/8Pbg8ZQAllVf/AZ+ZP5e2Jyy9BCPqJ7BO/hPcn624fqc0p4UcrhU6nvdwLrdtRw/lqQjQgu2wBp4QzTMqA4DNYob9x+gq9WEvaZn0gjQaYpTMStgm4qnwqu5OjZYbUBuT82jQfrQq9BHpNca8HQtp96udsFKKtD7jWrDpWU2Wk75nft8fmYjRMc+j/bCmnpRCSvZS/A5dDuHElOkhg4baEk/FD08n12Im0LGAOsMsPUFltOODFXlwXRMnttLlw+KXZJpjbeRlLVRcQ23QSODicB1TLWa9RkSiWawI+/I2a+0vLJnX4j7tePU0DZUjkZwDfPvN/4Qn5s+nfSZOm0Nrfsoi/xkU8h5eVQurfM+9bBBxxwmIYG+3thZptz64ODakO6GzX9Miu9kGdPxbY7HMFVP6LyYI/JjlLbBCmBqYvDkgkWat8yq1lvUqU0SCiA1mpg/x5K+tCd+gSdr9Sh+NFSvX4EahK1t7n6Mz0L8+tAmzidn+H+iov8Q4OYSXs25B4RWA0D8G0adwZ3cUc4Ww5OzTotJCGcGStFlOrr7Sey7pukyOUxwDqEnXhmA20/sY/DeumX43RSToSMfx8CO4Nq+w4S1xjh3s/R2aKJa5O3Ng2foDSiPcuH9wxBsJsrC02IIk+XFYXLeQurHO7bkYhoZZ+A2E+09SkTAW0Hw25kEh65fTJYH25uNs1mJs/OxyEa2LrI3u58nzhRLGA5mIbZtaYObXTH4J2AMNlz1LJHgOIjFbks10oPc7lUgkX0Bn11d/i/qDCXoXl/7/ERVnid4h5/ZcCrqacp+19O6mnVQUgX3DBvECG34FXsDNZcftoh1f7l//48tn436JTETDFQYNmAopbMUP0kQ1XbVYO3kKzJrGfgIDbZsSCYXmHWPo4Obf0CXnlUskX4Bly+/wWIOlHTGf/hJX+z/i0KukpRCoONGKCkEa42frZI4OFMulHXoqkha68bCRyhCYXG/O2YnLul8XkgmGStMq8jzO1ZF4IBJuwsEk3lUrJrASSZ8V+thjetUXs9WLVb5FciloOHtOKx3yxHsFrux/hOX6V7DGdlMhbZ9qGgU39wTu3sKwLlpuSS5Ly7lQ57UsI6cggY6MqV92udcvIJOe52GKnKRYPmAwpG1BB2uM9BKpifwSnZVP4fZplLEu9G6uvjqJ5CwicXaA+k29B1fH/Gf8zr/AL9Xl5rr6uXYZJcp4lU9hoW/f9lxxcnN0213Ldh18qyVUvqjzDN1S8AAvxgUksWMV8RlDMWgGKsg1iy7y0fU41W6XSFSDpB/3n4E3em3MbB0bo4NbflPDgdVJJOcAE773Wzzc7NMnmA//Qlj+DFrZ+6TV4AqlJGsRQ9AH3pyToL5iXf/OLLUYpsfQB69rN70iAXyhK9Xp6mSitTQSMQgsnq9kAheHUroep8rFV135exqjZicssTdFzDvwkPdvy2h1tConkvPw0nM8ObeVdnuc/ysy3v9NauJTFMWoLWGWKcQkinYwW1/qu3oNj5mA1lmeMFrRzNyL7y9nL8BAS7y1+6eXFmHP880kKspzKkdJobARykkDmjUh5f3jbhQYKDyodUjg2rwdGvNO0tK+V38bfjJXRh7JTEIzZxE+PnjmDKXzupiRaYytPBJtsVArG64J3FqRLck87y+W8Pr4T0nH2WNkZUHZT9tCy7yAmokuJlpz3puofoIQuKDEFJE04lCCq3c9jo0W7ZHsNcxbWMzbOiNFKfI1SCRnoTrKa6/RydDQmzYk6CjyC3Rw3U83R9UPeHl0xLB5KztapG0/ATue6cLdo2jn8t+LSqQjPRmtIL4I54hC7fkTHnlWQ8HWqvCqvlusHFYtzgK0jMAovLf9+OXvhUxbwrrJXfFboROUc4p8sbCJw3f+Hg3Y/Oh7zObPNFEJg2wPekJRzP4SImNZPrAx+rxY235qbgmZ5D2wADW7tPwnbuZ6RDgvKRKfM12fRyQn1wyx1URL1RsgwiYx0PT1aiMT5c0JrUeC2za4OG+LzezM3lU3sGUtu1W1ZwEBaSvJ0Pof0bZJYzKw2ibRXuvReLfCJayrum5RSFY8CfLsNX0Q44uEI3+T6uPD1I2Hc6gyEIfdvnRqh4QLNMVzTKiRHDCOB2kliXcVtlWovmQ1/fG69cQxPPwYYuvbPnufxeuTp7atZZewdRFYXv4ejw410Xb4hP+Vif8LIg7bp4pDUVWBOYfh8amE9GHvD4uT8aq5JbFxWoZmfhAjsWxWCF8FUAVo8YYXL7aizh0Y2EkMcz9mw1CLINVZkWS0lULVTECFNHk8QLhPtqtG4vu57fFJ6uv9FpVFPZJyxfbf4IkwQzvhHP4lREKEj+lj9JHqykUROoPf9qatp6PFqqamuSUmtA+QFgSvnIipgUawfLzhYkF+ikyEV3aRqo4xEi8FAQohYYlHOz1VTViY82JlgA3tMAj/Wo8+SefjRzb/42pJk59dbP0Bp+tVNwnMzyDO/zk6hq6k1t3tKr/tJEoP2Ol54dan/0d1gYuDxoDmwK3q5kIaRsWARToHBy8Wiwtkgu5wNAvG0U2gfISGxdaBX/wqKtMIo4vP4NfsBje+C5F5Wxing+u/S+PFmoWqAZqCP3eE9qfEvIz+sUlro3Ahua2y25BpGFbr2+TF9vUUKZKne+IEYXC7tbJWKqxGL853blM2Wml+Ac6RRUNAxg+hmASUgiun+69USyX6KAQMoXU/BsD7aIgPPEP7E8dotKeGQ8DXi009nMvfSQfFy222xH8uhWJLunthpbalRu/2iARv0crI0ioKejuojj3/UQzN+VR5qM9molyTCxCRiU4rmfqCmyNkU5itdYsEjyt/mwSVnMfw+w7DMtkGG+S9pJfZM+bTmWKF/qoRvY9z4N+WPBIz9Cra9c/A1lpLW/eTqURCGSW1SmL+Tv1dVAxgts4zLYC78DDMoiRVGLhQ/6b1y8cjMtGw8ODwaU/3uhWjvpAkRBAWZqlcNpGoAMMk7o5He6VK+B5srV8F8WT/1fb/cLg6dOB1zKGjJk6vsbUvoqe8PVVwu5IIRXcb2KergxuykbtWFKjw6gnBvRHdFLzipATdYTAM6aISjud+SKql3XhWc+6NWiX+1DagFUomunNQlBtxEj9gB0yu98QLPzchIjd/10VuZgqaLduxmfrivvcGhfbPLcsW1kJLUjGEMo4B/S5O9rOXv1u8DN85lloxtrrxsCyqz18zhDwEMuq/vHo4IhPNMZmYIM+aABEcqyptjLmS9RJYHgKzm3k3Hr8fUvipUPxo7wAiN05wnVFs2sThnNfoZDzmvRkRitAW9J3+cicUUS2N6SB55g3J6c4DxekXmvEaii7jp/vwnZWSW/IlsAdRpPPLsvs5yyRh8Vh8H4wZh4swVcOkIvlEBTUVXHU9ie4R/lEyFTvo91dOEehKw/mEApsQLo+8oYW4qYxXHKNz66rwd8I8fbL1+8VbJpBde7ouL/YhhNaXVmyAQ8TgxDs3bLrQRYueaMJarh6PTZSIomzpcUQmFaeZKFmMsQquzB9j5vnQxmnfTffQoBNcZxdnCQWi7BvQ2/5M68KULaGIWF28aC31SoBzLJa1CuF1oK59AUgMwuvFodVKArOJr+6gi92csS7iuFomHmkFaiUTXyrPzdEU10ncH8eDz3D/AXrx7nQfnd7oUuWLAiWU3l4aqPPScHXMJsxFZUgoUUnGYYzrtzHRfFRMq2T99yjuEd0Lq/+OSsstuQCseWvUvmPgIsukYH3klUws+ZjaI/GVKsrH0bXNnAXz6wKtXUboQ/yCnUFAfdt+ePkdyBxmASCUzacaTtcnaStEuj8nW2YuT2EvnN2I7r0mE0W0SoD0rQinsn0MDzupkgEmBpskxk9ewjJZ3kccS5KBouB9UVmtgmwTdBB02kF0jH34FdtCQ9uNoaOL59FERQmuuEgX3SrP1YxKQb58hM5EhOLBQqEpQuESE0phZfAZDIW3Yinv42JaJRteFESDg9tY+D7MfHGqZGj+mVBDevDCxYnnFusEkxnDftKDdeIVqqtVRh8uqPKsRY4OkbWfiDEfxw0dHCEa6a2E2iQgDBWyPj5J/m0byRsLyKRCMpr00NxCYe4nFA7Ui12Fmf3FDVEEgipiLZESSo+cWb+Yto5Pnp2YzGM49fmlW43OOYSvd+L+9cQknSzmRDM0RA2hmIdw/ZZSFeyOiV9QF3R+mUy0OTF3xPuTmN5DxI899YfgKVTEhK4nOY4p/Bhmm+2W7LYYZfel0wOD236wqIx1EuGeHuL32iiW30jJgSw1zjXUPIZ7G6O6cUsxXdcwMebnYmE+3ZGJjQ/gdz76Y5ro7qH0WJdkP/w2wVwvc1KZIpRn5npb00rrUTCNQShUCkJRs+QkW/s61NftL3+veHklWuP1wT+mxTHiB0X3xKmKRSp0keoTWSbq+wSsC/08w2zh5kTzX3n/ZIl0kgymvJNCdheefISOsjufTpza+k8XZugHVJbQBV69Syj+qqBT5ajD5GlBwOFiqN8LQqYOsbaJtXQmG93BOmc9b1xCC8vLqNx1MmyjvmRIJx/fSGe6e2S8myjXU84hb5zb5h45/cxcAqGYLwiFSNekFI1QNBsaU+Q2tqZ3MqE7GBaPiLXGa4wj4XV11dTSxaUMMxdyROGHrYCbsy9rfEqYKISsafTa1OU877HBzCKn8XP2gSU1DLwjbmLHHvmnNLGlHGdszE5rtpH/1rvURKPUhUtxE/neLaHQSmO8JXh9Lt7VDApJRHVkKNrfNdBlHLgekzAXx3CoH573cU/MgTBHe3kuHXjZpxPrfyTDUQZnuVoqFxDKVCFQZt3WoTiEgtkGZvkhQ/xKGsJ8cZdTCOcmMnN9Tj5KlS68XgURmaRPHcLlXUpidaW+VwlGWIjBNwLeO6SbRmE23x7zzeFhU54rgSNr5E+oLhfS3DwFIBH/DvSxu9DQN+uqUfwGXYGZBIV7Xy77oCqs2EiK1b19ELHS2rUygMeHcLl2IqT/6QSiEw//KR3ze2SsbPNpzhFKemtGGvCbrLod3bNPKJHoOoRW3GoNv72kg4bfp+Kh+3Xy7I7kanz/WqIKKBg9XQgnE/UX9tUpkwtEouVhdP2ijcxQKmPoCY7jZxxjsjsw2D7xfB86CUEnKbd8EmHtTK9+Nt5KfsMiCsM7xeM1OK5ksgwUMUdbPRK8L5MNGZkahVc09yeBORY+N3fg8SIYIitgRN4Cf+hjz5oPc+20Z90fSH8UpShHK+UcoYy/m9YtmfR3iQGh2AWaBUWzAHxJFp/9ObrNL7x2OrCpyKK8t4OaLdODuBqLq6o4u4gPNfviDNgCsudlApStfxNVSyDdxlNkt7HmY5O3exD96C9mmG9agC3R/RNK2J3UxdxwB+XpSd94X0eTPw46vEtFSGHRWrvT3+RM31cYdEr7c/D8Flgpj2Dm/SYI5ddjHj2aaKKb1v+YGtUaonKEEsqphtMpz9uKH/Rf8MPfUmF0NtbyaKQPLXYEZtBm8b33ezcUr4qaQq8BRtUKkfAhKdPNyK8bhrJegi5dUJr9ROEFCH+ROMVlySh5aCNnMHj24/5T6Hk7Qy92vKHM8klUvX/m96nOjtIiiG73QnR8Bu35DE7wfrTqTXisbo1/gxOVXjs1mzvxHbfjgj0pofw3krHPTEhw+1vt1Noj5UwodDoe87bCwvqvaJeZXxxYyCkZxLXYIhS+ukpr/xa5j/wyRfVGtMar0YV9VVWcHQ2Z9fKXIROor+qywzu3UaZUGVKJ2k2j6CNHMdN8LqH5DNHTI/Pm0cimMson0dno6X9NTeNxWga6+Aomx6+CWx5H575rqqqWWhUzae7qNWzA1VuCtnkAQ+jXoMk8A3X6bug0nYj4lGf0AITStplO1/m0BSHEv4CC8g4IZcbKF0hhacUnIJOfJ2OxXRuLXcMGF92L00Jh8zB+V2WWGrgstFYQSxi7RAZsagzcGUYiHzQqDNryi+VM7XXDx3HbCUv/U5hY++tydGbTs1Q2OolaAr3N1DTZSMt8X60Q+zTO9yHMiCsjfYRmMywocXRaWClyN2aEr2JMrrcS3pufU76Eomt5ml6hfhOmt6CtzpYvmAlCyaOX78Xn/MxPeltf6Xt+jIqMdX8ILcwP12DU3aXFhKiaEFl4F9PDOcskF4BQDCFwp7RSRguzJDrpDDpHP0gOHcRuN5Z2ByGd2jyh627Kw73RdOmt/55a8ilagZDMOkRgngR/wzKh5fgRTbMlMJ6PaPEYcwva6jaIK48jMvcMBmfZE0rHvFSfT95bM0Qo2neP4Pf/NXrGq7SCTsJcLG6ED9OypGgus/cIzqGrenZ4OA8aNR2/8NC5Du7XIY4T4gKKEopeSCkPy4TVPJUhsPshnNtnOMUdYZyO+7eVT30SJZLBNLVMZOhmk6d16ECPo2XvRRMuocKGZsXULvS7QF5R2PlRWJpPlz2haMW2eXQhoRi+Hg0FgRPuw9++igd/NXGG9hetrut5WL2JYskQOhbLfboHFVUbCn7LSI4urFoYdXIImOLrmmHELknzGeDuqE9U6lkfdKaV5UdxHggD8w6w3efG8w/BFx0qRSe5FNS1GR2l5uxYfoVh+wD062402z0I4S4mw7rVavFnpcJM2GCjdER5BITylO/RXV4LzVHiozLE+YQC4XSTtfIObLnpE0rhfScx6fSGYfj/Noa0fVtPpJsUGcJtx2lOwPYhnJNOJtWyXcz50B6WS3kXXhtztqtng7RKRgHEzVDUOonIpbRcAlKbFA0Dk+zGqWw3vrcvH9Dp3sPFW1dxJajY+os/pJaxbP4mY2Jr0YCPoO3uREsvIDV0S2neSrS2MyIUSGAPY7Z/Isd0+8AQojxlGjaOCOUt6vNs+m32eRPac8vVCUUKm2gZOo5f/Bqc9Bdtynvv5e9S0XUSxZoXyDcmuJUtP0gVtrnWNQFGx5cPRZ2qdQiWSSZlC28wKmiGJY3nFDysHM5Ht0/Q8ouf4dBunF3fexoGLgP3ZmqNTZMfp6Uex9ZIaB9BZ74DN0RsbKos8pPOEoooodDDuNqPhZZuUZGYypVQVEN5K9WHsOPbePrnmFJgqUgfHgeXmNysFsSKKswT/xwW2H9KG3pn62/SUGlSBYQbiZqtZ9ah4VfSrAruJYXFeBzMZi/UVqMfq4VSE0kKQSMBupgq4co6utxdSqKcsAnw1cPoIEe0ujwO7IjH6WhfK41QGYSBlUjeW0ENPJhfQiZ2L1v7MPyxu3C/EBxSV1aJjpF1xI24kCs10YitTAYJk3lmOe3aLFKWBbaVUDaQ9J15gt6CJZqHdo14ozwA92eB6D4zEpU0UOt0GL9vD0zYN1j38MnQjvf/EfpIiX6Tbubd10834eTWySX2lakiQAahkYULLyITlsaVoIxtZIOEkojNF6q7c0ncnKg+CckEOksfxLg9GASfk3iHgj4a3PFcGYSB0ZF1nU1+OLfI8+J34YQfBOvehcZdiMGaKstUPwTqMDE04yrfpjM5ok2jmTGa7H6eDvZSmWUOT0EJpWe19L3aNv6mpeQZw2YP+sQdeEn3a/F0ZjSG96C5t7FHn86dpGObfoDf8v3SkWPfaWqCjHA/IqIqvsbLN5H8xqCaKobp6MBOc4GHEFkmHQjEHc6RxGNBAIEzizbQlao2cnWKO8mqTpJBdxhAZ9mPi/KZhoPh6596f1UZhIFBJJo/YOuoywvjt+NkYM7K3WiiRZFqX8YhQCnUD2kTK3eQkTF09tFMs5de84IcL9dNyQqlFeT0N16g99MZOpCN0+ueDdosZAlYIsPw0/pTzdSf3keTm0q8wFGF7WMn80vJGK08P7cqw8FTkEijMiMdqy6ky3M+nW6Yw+znYEDmWCTSTYo/ctGpLdwbw4dxmjvgA+8yCAOn70FEZ22p3Rvh9T+m+FAqM5fyydvE2PuZzN1SUOx13UUlqPZqiWr6/d043RHoPSNwa9MYCKfLKYv4QrC89BxNQuM5tqaL+uJp34cNqP+HmzbBzN6ks2TpXbUTY1QXM7F7cDJ36o6YVMXggjXbv2nnJchkNQ4eaaMwEaO8tbrMHYSiYixTYY1OMViWo7ICuhr4OHgN0Ruz0wvocGyShratpZKHgVWlH/VpTnzCV+3hPlDvvfAEl+PEdZ1N5YT/WOcNWoAOvxaTxqCfN8NDQ+gcIqNlXS8XVsq2worxsrOiVEPbPJ5bIp7/KGskrzrDwecgyg9hME49/qXX5mjMGE/yhqLl6xm8S+tnFCtqogpNIctVeD8IbYeJ5fdn4JaVQ5armrB1MWqhieAmMWYN2HUt2ugmnJeKbBW3gAvWZx0adCl8ygegn9yfDWmJum/kcF345SKqNxy/l0XLS0RJilUNCOEj5PtDXx6XEZn0/JCk0Y8U2rxQmIVloNZJIMVb8JdHBx/EV6l7o2tvdufzsRO5+qaSZ7nqrDN5eqTJm8gvgZ50FwagFrlB2E/aiagyt3cshIybMFWsxAXW5Kp7wYhd3a+X6aLAMob2Dy9DC+GSPwSrD95XdVslapbgv3HfaDLphTj3w8fiIJMA7oRQBuGUtO5Dw8XZ6yRaDQwig3sju3FGv2KfjrTFaXjbcyV2bzRy00F1w7Z5vvViq0Gy9xmhW9Euc4kru2rWlCCriw9vjwZCglbndlFbueaflCu0f1gb3oMBplZJddUsuRQKlQzPYBa9KLv4CzcHkfzA09i9l4awmMbUlZPCQJ9N20Q/W0/qFKIL+9mYHThywNqR02v6VOQpoXujxY2ep4SWWvSYbrHW3ieWV+OE5uNW2uzWmYLqJ0JdNpQ1uF/nW1pxf5tuW1mBe/WUAGqVYGQtYo8fRlsukyqrWXIp8FSV/3Bo6DJkommSgxg+uYJlQmLTYNqsiqI8a2QSjUZNPNItYg4bMqoN77VCJ1d5zeOlrri+ZiP5+TnUFjO66tfeC2HtDpzwIqqcyM20EIW0mZbgej8Aa+Urvskt6u6polqlswgtfqRWCVvdWKuKU+fPgxoYHNpTE8tbL1rSMjUoWAZUbPWgkwRBVthM4FkmWvMwa2TCgaiQw6Q1SvZgLtwFcjmq7s3GErs3GzaI15KnJl8HGdOdsEgQSqVluLVQ9c0+qp9oRGol3MwHPRO/K2ilznJdEFguiLSSBlp41iqh6k2d/xI4C9Y4mth5cVTt3AyrCSiQ3wKKSdpoISLVTc6KsDMPVXEm0Xn70ZX3w2ffiVnxEMJHZ14qA/fmyCNUnzO0wFK4GlbavayRG470heoqcjMFNc9xzdthCt5B1j7oeXTL4TSI0+knl8VHiOBgwo2sEinsLlATiLLTxRztvUSk91xnWb2BpE3T6W0sg8aZEB3sHOWc2JmtBxt9VJaj6A0fRufdhW/dh9BrX9qj8dJGbwoZrgiTd5owvIWNdzesJ63fOQ+nXdWhU60GhmuiVeLXwNV8IDZKy56phzbk9JOLoJbr0AQtErYPE9WSVRKN3tGoeFXPxZzwxczzPFEmBirxKYM3TxjD46KahuFwRm0TidKeR0U3sha7V6vM4+OPYcofKXX0RhPTMHzaLAXLhb07JZTbozU3iJxT1Yf8oimjHpPIchiGD2B03JtppPkbeio0/D1rEB56CiI1072Yp9cK1Y5VQpHdTqe8GPVfyns4N0A01wSRizAMEcWx4QRYV2uuwtWRmYzoWDY8gdPAycgBEfMr8bxDqRDuTatWbSqdexP5wNBJEnlaZMXcjvPT7SiWYnC11oJKPwXtD62wTm61bHWvl9tPNpdvQaVSAOK0NzmZX0bGPhrtNFBDVglgjcjREUz8l3rxgtm2A14gZPys1XCtpXF0pjQVivPe+CAvuEo5ERlGZz2C8PMuWED740wnjy2Ee1PKtSFT+SSYgudZn24xxtwJErmJNQ/D1NzMHEN7wK3ju21o15EXrByYQARLnLujbTAZp2YTi92Lh/dNbVlSO2BNajWH54xGvHARzHlvjIokZYTyXuipAKsrSydYs1NnIg/WTiWnEdwbsvtCCff6ho759TS8o6QV5oVX/JjiGUPtHghEQqtlBSKdpNxXAs8iUugZi8mY+5j9+4JsfskGl25Pq5+nWKIVkwzTI7jpAs/astgsq466/8zeS1c6PM8yYRlqJQutNjCeRlqMpsuqbqJiaXiDIuzZ5LQBS3IQAt9uY+0hmRw705wsbfRGC9p0xqg5HtJiuHZwbxgRHFmE31v9OsnloQTaiN6wkoysM4G5+1SM5tV0uj1MkY4OakNPvp+jRZK1kVfyBaKS0MOWg8Pb5l86M/6CwaKrh/0myocxDHwJx/DHYxoilkIZxxs4C9IEOC2ldxQktRtuxD72Yn2peOPYphK7NweGIKZZms+GbiUNjXK0AK4VL9a28CjQAoTadbdA9KIHocOvTn86MadsdwmcZXT/lBIh0y0citb5XVxDOtoUWP2TvoTxT1wu4npBx1ARllZRELeUgTA6otaJ6iawTNQNuV460S8eY62cprU6bbgXct6xlnEafnmwhO6NFjraRMl4QB2ehXsjdAd+7wr8yk68lqymPaavG9HmUTyf2Nxj2Xsgnqhf8fbG2tNPogLcw5l56MkP4pfDDZYGqjXoXlosBxCgGbzcWy6aZToGoNiGcD2CSIAdkcjVkfx1liOYcm94AJ+hOSV7POMdCoVOj6Yh4pQwp0TT5f0haolBG2Bjb4cwfBtuWotCO4pL1joHqUO7LIv2Sbb2K3CWF9eWfiL8y0Wn6yUeu4NFHolqwRRhQ7WyA2tpErM3Pnn5qv/mS39AAx1k81nSVTogETuCGXuMxWgi2zUmr01VmCcaxscex9/vxTXYzx71xZM02ttTul0DdaZBOLoBQe/51tpb0V9W4/AS/L4WsK9bhn8hDC5lC2ZjuIHmQfSLe/qS1LXmhdpwAzUUTOmmxVa3MYESINW4qdY0wDqOA9qdm7hw463z8SWGZdF6sGMBIjhefhyfMBwVQkGQp1AJja7l62EWsbLYSUv2AL5qjwSI3hgaKux7UyLRFSb6ti7MrDbbYeDeaC4FTkTzBbQ+ScK5N5cAk49W6UDbIWRuH4E9eQdGVHvV55+oO9dFLR55azErryPDnVSbHSRaKay7avZewUO5yFyL6jq2Uj4Vj8E9McNKKPigcS5sLTBdAtD3IRYtZ3B/RInEM9H2ngND6vaU2L0Z9DHTmsTiSCFis5IK+8E69+YKwAVNFEx8cy+JfZhzwW2D/dRSrht6zQQi0TVHt2AkPUa6VUiV13a9LCQyJA6IZE5eaexe3BF6SDqzFOZz6XSYC0eZ7DCOjkV1H6elm+jSQMnjX9VbTjDxPvzdflgAfamARkuZMq8dfx7cG9DZfJzmShhHq6JtPJ17My0UTHxZxobvB6k8CHt3xXta/6QKBdmoVsk4JhmyD6Hv3ocf31ajOUdqi6WhEu2QhuTQld52iVmFJT0IJkqkMl4cER0xg2JFc060IvU0UuvVvTHjhqkfgtUh3aoCB49mEzS4eUkpc0oK7s2YoXZfF2epVaL3xrk314Co3KMVLffID8Ha/Mq4n1v6zO9HJFNFDSj8dhc1wom7C67No2JY9bQazrGhIbG0K7b80pmvZ3FJE7UbdJxWEdbXLFiEggwPiZYluHp9kyinRFcEw4Q5Bjtmn5YWQOi1f2FTaVPmdRHfsC7KygeLrKFbQXY3Ezv35lqh5R4xHcwBr6yyVh5jjq+dqKeF1VRQafWLFEvn6GYY9I+jf9yhCyCpdqFbsB7BwN7X+8aVPZNLDiLNNzHzMOyy2Umx4TB85CEIsWPRnjp0Rb0jWhFsRU7BfTjARvaBWE7k0zQCLaak7k1jnOpx5vPwy27GYLgV57g4ilLU8oxzvdA2E5mHa3sXImLdXhiuCZpoPgTZiq/3on1lbj91QVl+CCFx3KIdBGt2suFoaxG7i2LUdzWt01zuE0Z3UohOMknWQ0SHIKTKiJZ0RAPrB15knRS29YxqoJxGRzuMAQutxDsaGDoTK2lOifAvmiiRG6M5rNs7GHMrft9yo9EJRlSnVv3gGwVTXDShjWQN3IBuTtE9xzEIN/RUMKFA+3mlk5rzhu6BN/4EfqOuw6nKgljXgFHIFp8GEzR8tTdehnGhTK6iMJC6rDV5FVLPgByGtM4J8SUtDHWYtQD1MKjmBBujxaGh/tJJmUNjpcwp6X6dvDpDTQhJL8C56QK+lSBELQrdMFWh3eF6IaL1Y2Hh8f1s7ROegFDaMxVKKMJrNvalPBvcCmP+CfQPXfBZY+tvLoJAeD0Bktix9fuXzy85i8uabxoibmzHB3ixMTLmtLCc0SpLeOkSUZ1ICxnH/SnMUgdBPPtNPn/CejS8dUPp6pSANDh1nOryKepkCW/CSdzCDPcm2qGeXdGfmUG9MC9Ft3uQ2T7lSbIiCWXNt8lvpK7FGD3QgeRh9J4uEGWta2kBhtBuTMKHpra4uCIu31gIEXvDFCQYJBFAzYX7ouHecwv/vsiGFQ0A4f4M3nOMxe4PmY5kk7GBrna1ZErn3nz9xxRPD2TaTF4LQ3u3sJWbcLYdRFE5Qie6zgSiDb2kERd5OQj6IcxkT8YjQqkcl0d1kuZ7qNPmdcmAeVyiokdc6+6NQpNOPw7rIF1MA1cYUIUQMWyOjIT5YY/NgGonEGAniKItMWSqJ+Vgp4xphpwRexB/djBmc30JW1rRVUsLjNN4k8SSXTCbVuBcV4Ls1L2B6epySmYU2g2YGq2WfBR5GBbpU74N15xaQAu6e3TRZPmGjdV6/Xk7teZCukfYPk1G7qDC+qxah9YcOG4D+iR29Moh4bO44uzcDXcGVkbWxGQUUZ0zaHi9jVIhgU27UCia0aoFZskeFTL7vdA7lvPjg2M+3JtSia7oIAMDlGKvoV0kXCZkb5XC2ps2cjklswOJlr/BQuHlEsJN8LxnJEv3B+20+Bsv6KZlZUgoOKeH/wM1gO1WGxAJQ/uBSa+Wq7NahfKYIH4VZ9rb28PTMgqu2Gg9cHVSIeVNPD4m1juN3tKPL9H0+kkphIGzHD2nPrYQXYkOB0Gmf46h8dJlugpv2IRAVkgtUTFo492sW1WgYea6nJJZRmShSCNaeDkmnYfR/uvx+KHhkFY8tZGayiv1XvgbGzHhjGsCnn0STx8V3SvYpQpEYN1LWOijbL3Wa54ernJxC66Ol4320Bkia+HqiPpPEFspg84yBlLRStWH4A8dNEwnmpPJoWQJi0Nv2ECm7zTVh4Y6YbbC7LYr0VHmR3ubuI4y+4iq3EfV/GERyjroVL+GfvNELqDVm+dSe2G1camtFOF1f0BJJTnVeECBT4nujVTl25lcA9TFOcI+fTS/8eI9hS+Hq84UvfBfvCbKeJwbhbjdL2qdkAyphYJvRJSHj+siIE+8ozZDZ+BjTZasehrM1mMbKA6fvc0ztFgKad9L8UIHtB6XU1I0RM1cCBsTfQXmynqx9mt+SGth6S565veornRWirBm6/p1IDtL3bBYvxotrajFgkeXRxZ0/5nkad+1jOWrX9CpqE6M4qMQ2M5glumHzXEKjN6Hi3DcCB3UlHl8Ul99bHCklNXT1jy3za8boaZ4QF041xWYIlegQ2sGY6M40bUUSOiKbHD43SCYr1qmb+LYY7kk3fbeYpqzWjNmi6ml4LtUv8m3000gt8fRP9bDgL6TCvsEu4lGIVFQZYDJfpBsnr6Lo5jG7MDSMI+C8fxoxsRgeZA5ISyHxcpB3doT1sl+Y4Pj+KCh/kRbyTJdVZX3b1+TymSpPdQ6rtbCKvEWRgUVqnRbz4pAIfW+HT3tNhZ5HG7P34L7+fWxND3QcYqWP/yn1BK5PrNMKmoJ3f9jahzJ0i3oq0+z5W/g8L0ikSjvdLRzYI3U7oNS+nGh2Ps1/OW03iUFsWpyIjMvF0veLGJvgT7SaqMi0WZPPKS9fpZObv4nUYnGkmglK34kifkedBJLq2A1rQPZPQTz+laQTCe5lOjyAKKAoIwhjmrcyE5cl0/hOu8gjw5aO3J6qL15YscGWLZRr5ypfhS5NZ4WOQoywa3s+Y9C93sKH36HEgk7IvkyhtD2/47yk3/41vfr+67lD6dn+qPFu16g/J765Cjn6IRlMcZ49YiYjELoPI7BO1wo51Yq0VW8YwHVg+DmhmS1vMDNsJrmw4LSTZJcpmu5QPczpij02oAxPhfmNKI+dhXifjvENO/u7Kcj8/4NnfZ+j8bPNEnuG30URkXO+Xr6FaJ6L5IZOUzJTAt1Yo69w/jmUdIFfES3qCDviORC6Po6w3xUKHzfG6kbuta/n6aOwLKxT8I1XTTZaGiAcmHgJbxYYChT79Gwl6fxl0u1/ka3q3ieEo2JbBtxYiGcrBXofYt1Nz5YJ6koncqhnKADuB7XJQEdqxWXZxEu4a2epf2YCPbZmOwPY97RZJoGejto5Kl/PZQOfiLZsRyFy1vJ6nYsP/zh5ctgPP888UsnyGu8ixIDJ2GN1AVLOW3ujqxV4XvQGRbp97PTSC4CRkoGDbvds97nvXTpjbau+PfX8mat+XlgiBLxCUr6LeQ1ZSiYSFE6qulaIq2ku0f8+Fxqy+WCldY392NCegiH78DJzEfjpFwEp5yhF4cD0TSDwv61A7AYjmPughtERyGQngiF+pm9QYQpxzyhyXwAV8mnAFGh0E9+QSpBhjjtkedbSuBvmsBY80jszSCRO8SyFjlC9Eba3Srgy0JFq8O4+/34uPmPr/wzHrnWD7imCIeGiUAo2Z2tFCw+SXzyQbLb/goWSQkzXfP/gVLhBLWz8REKtro/8CJ00VZDkhBHJGWOaIGX9sEGKYSS55BmKgvrZmhDuHynjeHT6F1n4AoNIkI3YsROwMuezAvl81n0Pa2dr3nalnyfvaQul2Cx0MnMItwgxItaIu26FxK7hXuXRbTqn3mHx7ytdXmUR3bNuOZwaRR3xqjdAXOS1hb2DKSSQHjF9ygeu1M3jw7mh8bchEO6v4tuotUAmnXlBSoLJkoa46hwdROuo2oqutG95jzo2hCtQzqJa5wli2OG8oywEMEMEYan77FX2DxNSYm1Lm0TPqsen5Govd33rhHRZuI8iHZ/N2fowPXmiV1f7kVBECsRiRQQZbreRnU2oA4xvJR103G4NkRRpqsTXSsVEs1OOvg9EEkCHANCiEpySbR3kwGVaAkMfW706Nn161L4O4FDoxZIwQoxJe2kFQOEg5n2wpV8b0Hb1YsgXQ6Vmcilma5/SHH0uFYThgsC0bU3rNmWWhxaN0ly5mxVQL1UUIbQF+reWXZguWA6O+fROsf22hGleMi7YZZ3b3r2+pNOK3LQbdhExvepwQ+oM4Rrgzj1Mog2XVTIZHSZrjUB/tLN4ToRMNv94Ox3wlBX/1+/bFF5ZDJVXsD61AbHbiFEtuWYuRaiO7VNLdRyPcvBYVqI7DlEbfi9mKXPt37/2jJev4yKI5PVz1Ms9KnRszQXZ78MRLoUjTKXNBHKbaTl4DB9SBSW3yfWvFWfoL7rSw78AhVFJrq+oquLUl6G5kDNXxyRidACvNTKruiRg8P0UVjQp3uJv+sZ+vSlvhuzShQVNJMLv9dGsVxATQgCdiEouBQNshSRHN1Qu96F/xwcrgVRBGcfJuW3GhfQCfrOjeeKVYxlousshoPRepF8h3C4GFHC5SCSeSASXX/jshodHKaLglWiJVjfgVzw6Usf3bhVoqgMMtFQ8DGEgpPxFjIxRG0Y7g0vIisdU1s3ulCwg8N0wayrt3cZNr1jPqySGcpgr4hB2P08eRoKJpvsMKFdQrozn6694CjL0YmuDg7Th4qs/Zigt3COPtv27elVnp8Oyp5MtOhRfDklxGRbIYrMt55ZKmIWcFRpnlPkrBIHh2uBksd2tuYNaqGTNxrBOR9lPxDXbiQ/N0aNxF6nJbsEP30JLJK5sEi0aLETXR0cpoloOQLxMcPyRsj0ee+3rr7l57WgrMlEQ8F+llKhl2szxp/PugpUZAH0ktapBDVnlTg4TAuR6DpKYrdZa7fMP6O79M3sIt0yHoyFULCJUaPk450c2KU4thgN0DG1lYLTShwcpg3OM/E+8MdrXtbfvamHr7n40dVQtmSiq4LTjZTyheawRwvFGAiv3AUi0QLRCXIZag4O04XAKukntltYvPc6FtM1l2ScDsp0dhce+DrFghw1eTaYK2yWiOXFsNM6tEYFOa3EwWHagDMzCbnkMyveazRJh2ZrX6uytEw0QS0bUh1P5tvBKwt1n2CJ9r+RFi4kqDmrxMFheggwdg6R8V4Tzny6JU0TNEsoPzLRAtFDlIilqdn4Zi5koyVsWVcFa0m/OldBzcFh2tCKUZrp+i4GzVvNNnlyNkuslh2ZaIJaXXa8HoZYOwyQRXBxFmuCGm7NkVXi6ro6OEwLGCiTmHx3YIJ+NRunPS9/j2ZcdD0f5UUmmqBWT4nAa2gmE86D6LqYWRaASOawWiUkzipxcJgetLzAYQyp1/zA+2BhU1S3ZFarWJYVmazZSP54A9UbtUqMt5C00rxEhYUbOdpMyxklDg7TgG5bcRohnHdjPvVmiY7Pluh6PsqHTEChjQElOJttjbG6NXYJaYIaRXvBplyJAQeH6UA3jKBx3LZTGL6CiXnX1h/MzKrgq6FMyER49aaoonyDF0vMCQ0VrBLdtoJglbhq8w4O00UOzsx+SAKvxsl7v61Tq80XZzuasiCTnh7ihpOUzFCuVSx1GabFxEYLRGsFtRRcHWeVODhcDTDnmfgEyONNMqY3QXSsGO7NWZSeTETT5vfFfKaGRBhvJ7aLyFrdhU03uG50JQYcHKYFjXOewf0HiP3+0sto9IZndCHf1VByMul5nrg/sSJJDKvERNtVLLLMXVZErZKks0ocHK6CaGMhmmDDn8E42Rz36OPeERqlIqO0ZCKFxXxxC63Ej8+x0EqgjywkSx0s0ijktBIHh6vCcCbakc/Sq+R774wY6i/F/t8lJZMeOHeDumgvoEYJqdMIzYcWOw8N08LMiVKfn4NDBSDA7ahYeRPx4N4WpkPbnuPr3pXvRlC6wQqr5KWN5KUSFPc8qjcUtorYOXD8NNO13mklDg5XQSS40ilMwO8aNpsbeeRXLz03c2UYrxUlnfk7s2TCLLEf5GOhcFwJBG6OB4Y1ooumHRwcLgdNTBvCmPmIbfiLUOiTn/U3jxQrDHwplHT2bxgkybWTzVEsR4Vl0hPMMq5Lpi1JIsovcWtxHBwuRGEn9zGwyWd4sjkk79347dBJHi++TnI+SmeZaCHbVRRmUpTzmEbh6pzEyRwjjZMzDYBBxkAkATk4OHwB3fOGeAL/7BKRVygfvBkfpOO9j3PJx0pJ3RxNqBk+StncJI1amz/FVvaT2L146XBUGUpEay84QnFwiKCp8pwWQ/sR7XxNxLzqDccP9PZwUdLlr4aSR0t29FBeltBYkIudYt87KGx2QZneg2Y7ipDXAN6ihFK0LD4Hh3IFLJIsLPbDkF3fYGM2x0La1dsze8WOrhVlEDFh2bpTst0dAyM52+HHDMWsmBgiO3GEhzVhTQlPdRNXrtGhlpGPJliStzEu/pp9+qx3QBPTSie4fhnlEX7tYdu7QdIPfY0GEd3xPC/wQ2tipGQi4oNKjNIyrLw6coTiUHvIgzKOwVJ/B+TxMkbExx2tiOQ8V1rB9cson1yOTRzGVkt6rIvONHq+oUmQhrUeaMRjhIkLupMaKFJHLsXeoXYQaFBCjH0XeuLLKfY+yPXRwKbnuOxc/7JKDIOQFKz5tkzSOjoN9vU4tB5bY8hAcoKYEglQFvRiKOkIxaEGoMGHPpjk72M2fZnz3rtn6ujktp7SR24uhbLLMt22kfNr1shEqpn6g0Gf9QQ9WCUWqpMgsB5RiqUORygOVQ5Nide9gN/DFPrzPAVb73jEO75xbWlS5aeDskxZ17UFa16Q8XiKOJ8Ff8AaYRVh8a9owo5KsqIFp0k3LneE4lBtAGFwH+7fx+1nsEO2tHDiaDkTiaJs179MEcqY14B4WI4okYEGa20U11ELJQLTHCfKOlQPosxWEIZERIKI5s+N722pD+lIsWuTXA/KehD2/VWPzFsPJTtBgWXK+wEHAicHMXa1TZQIY2h+nwuP3Qpjh8qFRhg4IozjmCvfJzEvwybf4qXo6Ct/r/yJRFHmK3NZtj0nweqenWPzlq2ifC5aKKnrAC1esmhwGykoBUrXPBS30tih8hC57lEWq+aRvG9Cs5nitNUk6Gjvt8oju3U6qAD34Hka6P23tu7unUGsrSMveZM3EgTEHm4WKkpBowXx6G8p5KS4PTEcKgcCi2QSHfYIFMGtCDP8dUzMu6lwHyySORVhkZxFBQ064TUvkJ9qoAYZoU6c+CJoKDfjF6yChXIzXl+Mxx1ipQkXRyu0OUJxKHfAwuZxI3IwJHnXE3kVAcoPz8yl4zue5VndfW82UEFugbo8FEV5UjRCvjSHgWcCDqF8i82TZ/LwgALDJoSu0kxawc0RikOZAhOe9tNRFtkXsrxjrLwWWu+ToS46WYlEoqg4jUGjPN09MjbWRTYVkoVqEoqRvBVSk1CVcF3DoNmBLcwgFJeL4lBWiCI2gYgMwkXfhWdbEKfsRYf9PHYn9e8og1IC14uKFCw1UxaEMpFfRDYPMolbLy+GsiycFbZZWCc5uDvQVKgVFy6FC+iEWYfSo1DUSK2OfmP489Dat2MebhP+r3ITNFgONUluBJXtBvSI6e6gunRILYgRz4UauwR2yEpcsltgPi5H2Gc+3jUHcgsiPeJ0FIdSQplkEtbyCXDKdrg4b7IN360LYvuaFtJIMTfLmi1U9oytq417ZHINXB4bUJDkKAU5i8uSFi0iI6L1H3KgkHZcyia8FieXj+JQfChRjEEnOYT7j4jDt4zvbavPmsMvj9I4PVteq3+vF1UyUwuv/xHF0wlqBHW0B16wkEJ/OXNwC6LGK1h032KZS2xAKOJS8B2KA4kqo+kEpzvt7cOT9y3TFs/LfjbBiePbokry5VOP5EZRVWb/6h6Jt3ZSPayUtrhHXSHTUgTfNHx8My7ZEhDKPLytDT+7zrk9DrMMJYk0/j1FHu9ga98zxrxLAe3qmEf9m56N1t9UDZEoqm4wQZj1IcymeDzT6ptkJ6TXRTakFYbtzQjqL4MRAx1FdJFgIxXCx87tcZhBiBrKKv6PUSGj9VN0sa2whbd5E3SA1tBwpQutl0N1zswQZqGjJBsD6CSG2sOAFuDoMmJNcuPlmA8WCnEnLnQLTNE6MlrRzVkpDjcMGL+UY8MD0OsOaGoUW/Me+uD2bEjH3xuEPtJTHfrIpVDFA6igo+QMNcDdaZUw6BLPXww39iYo6jchdLwEJDIPZDIHb24gJ846XDcKuSOkxc8RrWHiXxHZDwybD4M87fGbqL/3W5oHVV1uzZdR9bPxWbfHy1ALiKQD4eMFiO8vV0IhdXsIbo9IJyyWpshK4UicdVaKw3ShlobmjgzidhDEsh3ayAcc5j+jbOwQbJHh3jKtjDbTqI1BA7dnXRMlOEWNcUNtklErhRcLecvRAsvxjkUgkilxFlYKw0oR8RynOFwBcGkEIV8ex0QEa0R24/FHYuljzyM8ppO9AzRZzW7Nl1FDo6WwULCVqM7mqcXCSoH7Ay3FLmM2EGZlKd40H1e+A75Os2jRJXZ1Uhy+DClUIhbOwLo9jQOHmPlzsuFHHtvPTSJ26HCahvd9T62V6nZrvoyam3o3vCjegSFKtKSpMR/LtRkTnxvYcDE6xFJjaRkiPovQSeZihpmD1mkEySSpsH+PM1McQCII6TKNoDOcQL/YLWI/JSvbxQR78zZxcvE8mqiGbNbrQW0OELg9G1aRP3Cc6kyMmnNhvp28WBdaYzFml6VieSmmlPl43onO00KFwksq0DpSqU2ohRHg3wnYqadwf5DUGmH6NMzR7lQ9HYnDGnn5u5ptXVvWyPmo6YGhVgodo/hJnxrEUGtsyvURsktYE95gpcAd6mJd3wPXhwoFrONRASYXSq5+RAvzQCLMadzO4MARFt4lTJ9REPyKjX/AzKWBDqJ0rVoj58MNCIGWspH8pE9JO0JNMbg+VsxcY/yIVNCdliDUh8c0l1WgjVwfkAqTZtA6UqlGFNLglRzSuA3jCh+HRrIPj3cQhTt98vZBSDvZ1kljmzao21O71sj5cAPhLHQFMqyOoJNSQZaafUNz0J/mGfYWiLGan7KY2HRFYWTiVqj3mkGbgmAb40I7urasdJwlEa2NwwwSkZM4egAHf2XC8FeQzvaGcTo+b4KGN43iPTUUqZkO3AC4AMIbXiSTgUA7hqhPNsi2eJKYg0aax2QXwhBZZMkugpeDMLLAuiWQClwkiiwVH53Q1Z+tTGiIBh4uZeHujsDO6BfmQ7jfLTbcBVLZm4j7R9M+DcWOUrq3R1cBO2vky3Ad/1KIXJ9tfj61Jp7KUkMMlorRMgZhOI99XgA3aKGm5EPaVz1F1/moSKuWShK3gvvj2rbMEWWtFoRVpgwejZKSiOHDuN8LzWy3tbQ/4dGRMEuDY3U0se3bkX7iSOQycB3+SoDrs5rIb1lEiViG6rOWWnwfYmwQziPPm08Ca0VoAdyfuSCgDhGBpcKa9JaMNBXRkLI4F6i8oM4MDBDS8p4ZXL8RZu7H/REc3IcLtYcpOCCBf6wxRqdtQJO1HqWZLlwnnw6UVBBKbjhJyXhI9YEPTQURHnSvuRBp55Mx81nsApjGc7UQE3prCxcslTp00vhUir4pEItr8uLjnBWiekgeVsekqLAKS0QjNLgkB9iafXjHwdDLHq9PJk6bSZp4eRDiqtNFpg3Xs68FXyIVm6Am31IbelsnrJSuSKAFucA6AclQOxq3FfdNuK8DwSSiGirMZ10g1/azigKBRAUBJHJlsjg0joNDeAxhlY+A3g8aGx4U8g6bJJ3ABRrMHqPJXl1r40jkmuE69PVgg3irN5DXMkaJpKW68UlqinO+lY1pt+LNZSUWo6ItzYVB0o5WboMLpHkqmvyWQueOS8Fa8Zy1MsMoRGSUCDS0m0fLpnFkFLczIPkTsCSPGjYH4dIc8oSOB5lMf3MyOWSXwp1531kiNwLXi28EU5ZKxwDFwxAkkaKGIEfN6KRz0Jc7GMQCqgChWER/uAOdvA2dHWItdBWSei4UZ9L9kqfcIGexXBfOEojoplZRHeBMlK3KsEKIBsDXJ9DCR0DyR2AY4p76wBhn4j6NQlzPOHdmZuA67kxAc1QeIzO2h+LzQkpMBFSPabGJOGg1xm8TS53Cdi60lQ50946pSm8aVm7CMGjgQmatEosvX2zCzs5quRzOaiARi2iYNo+HWjh8Eo+HoYmcgSV4iklOQGo9KhweM8Y7zmFuwEvGh8IcTYz5lN3WB+vFkciMwfXUmQRCyt3Pk5dqI29QycFSKhaneoSVmykIWgXEAm0FFgpcH2s7o6r5kbUSbRjWiKERuUGk+kohw/YssZizn4/3U82hYHkog0Q3tEAgBRcmK8QTOKQlEodYrRDmPjyGO0PH0f59LPn+wMQGjaHRMEOZxCjlXZ7I7MCRyWwBusqap0ACfRRLdVJCEnCD0tRgOd8ck1gLZksItx4iQhZCrZkDC30O7iHYSiFnhUEsNkqGU4tFFxlObdAeXbPz8liqzXo5F3k5+2TKfdECQ5LDL82gjRCN4VG8NoSGOI3j/SDoPrLhSS/m9cHVPB14NAipezRuaRJuaG7TD6McEWeFzCIcmcw6Clm1H79F/sI5FPPilBhvoFSdj2iQ5JsC4Rbf+EogrdZqCj+ppQKikVYuVH/T/X4KFovmr0hBZyGKMm69KGWC+azWUriekQVDVN6XV6Z44yxxqPlh7NTqOg3hhmQ4x+q+QETFCxOGeQTuyzALnwad9ou1A9BATuH1AfHoNFphyIQTY+mwfrINVsvL80Agz2olNGeFFAOOTIqJwvofo25Q2qMYptdEnU2nbDyVkiByc5owIJpxUVrQ+1sxKUNXMS2WbQvuQSxRfZXGKNRsomzbBAZWHDP1+ZaLOe82RTB6J19ca5l6fO7ITHYDueDuEsleujRSImvjrOVRWN6v4Vt1XXJ4QxovQf+gcdHaIVZUBxmE9XEa7xkAzZy2guiMocFYDK8bGofNkQniCP8epqBXP9NpIUWHI5NSYUq0TX22zwuzK/zJeopzlpKI8yRNkKvPS7zBt9RozxKMUDPGXzMGl1aBazS6eplMQ6SzsNThQialsFE7LBeOFfYFijJwCxZMZL2IwfsxwZ+77gWiASNFdHPpFdDnH7v8DF8gCIqsAJmSNwpuxRRhnBVLQQVMWhM1r5Xcca8bzmdwCpPCMoFjY/gIXR8zbFUH8YzWVtWozBCODQVBbjTpxcdsjCbyEFGbJiiXHqSw1xFIyeHIpOQABfQQb1hFfGA5meVvkj/uUyydoHjWUiIFCwQaQJ3xqD4IggZwQoNHXgP+qtHiBs2lUQp1a+tZTD0GZB0VMm9huXACYzyB1+P4O5CKxCRakMgejntRSLqwODEiGJGzNFNYAjDVOc7rI5oEdpZxokcy9QYrNGVtRAQiloXOEYdE1ck4NxVxyUS6h1BEHobMOLEdw2mM4viotXbUsBnG6yMgzFHQ4RhOdDKXpbTXQun4aco3L4nCv+GmnfhGRyBlA0cm5QZ1QZ4l0/33iSEc6gpmP8iSnzMUg/KY8BCQQIg5KRLXqE8KA67OFjJs6zHwCvc4Bj1BSQVcZEAqIfQWTuCjE5rbIgVB92y0KHKPwCKeFIo+wYpROwPMwuqjnO8eFeyOiDc4MmdCfJ/Ve7waSmHRXIA/h6sieQzzHN6kOR9aL1V1jzSTnRQxE3iOKEyUkTruTd1bA2sjyKVTbNO+l0znkpRT8vASFKj10f1Dsj2Rm+Q0kHKEI5NyR6HEJNMGPEbYeWAJBvwkCCBHfuiNxyw3xMAQWlMlkQfZhDHoKGGQxPBOwghBiDlMgh+iewxyFW/VFYqLMTHInTFwQbxQONuAUKwvbMBPZHDcFHyg8+ppR66MVYdFeUcTxEKQFoRSk49IRGweInLeGJMFWWRFrFojGXCVbpMJUglglfhp8vIZNrE07JiMH4Bw6ig7OTaaN81N+fkjIKSFFA50kO3tjpLQxAmolQFHJhWHL9wiDDgeeINMBwimMQdXxSdvEFaMDz8IQxKSSzpGNgWniXw4GDHEg3w/T7FckI/B0fHh+XgYrqqp4Bb6xvMM/BVjKDTqCYkNWT9MoSKH5phGpgrslzAf6mYgcGO8wJMA96CFMAjwB/l8mAexxFRMzXse5cBMeS9F+YkcXJ4YBS2TFIQtFOZCCjsOkx2Am9SxiqTgtjjyqFQ4MqkKFAhGH50lmbE9xMtb8XhCiabPjAW+SYcdJgU7IiujJmHZhPFGjlsyuRSZAPcJ2BcWTo71ccPjZPK8r8gU/snB0DGgHoPgrQnUlyEbwg6KG7LwwWwWt/QYKAz3jT7ZsTgej5H0J/C8j+Q80ohO3BFH9cCRSdXjC6JR9PyQaMemwvOzpHP2teV9xONtV+4TDfO+iOgcGCJpXDn1/A2iiCg24PnzU2/44Vm11hFGLcCRicMlIFfpF44cHC7G/w8L7N97Wcm9IAAAAABJRU5ErkJggg==';

  // ---- Storage ---------------------------------------------------------

  function loadItems() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) { return []; }
  }

  function saveItems(items) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch (err) { /* private mode / quota - fall back to in-memory only */ }
  }

  // ---- Utilities -------------------------------------------------------

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el === document.body) return 'body';

    var parts  = [];
    var cur    = el;
    var ID_RE  = /^[A-Za-z][\w-]*$/;
    var CLS_RE = /^[a-z][\w-]*$/i;

    while (cur && cur !== document.body && parts.length < 5) {
      if (cur.id && ID_RE.test(cur.id)) {
        parts.unshift('#' + cur.id);
        return parts.join(' > ');
      }
      var part = cur.tagName.toLowerCase();
      var safe = [];
      for (var i = 0; i < cur.classList.length && safe.length < 2; i++) {
        if (CLS_RE.test(cur.classList[i])) safe.push(cur.classList[i]);
      }
      if (safe.length) part += '.' + safe.join('.');

      var parent = cur.parentElement;
      if (parent) {
        var siblings = [];
        for (var j = 0; j < parent.children.length; j++) {
          if (parent.children[j].tagName === cur.tagName) siblings.push(parent.children[j]);
        }
        if (siblings.length > 1) {
          part += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
        }
      }
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function snippetOf(el) {
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return text.length > 80 ? text.slice(0, 77) + '...' : text;
  }

  function rectOf(el) {
    var r = el.getBoundingClientRect();
    return {
      top:    Math.round(r.top    + window.scrollY),
      left:   Math.round(r.left   + window.scrollX),
      width:  Math.round(r.width),
      height: Math.round(r.height)
    };
  }

  // Build a markdown export of every saved item. Designed to be pasted
  // into a Claude Code conversation as a single block.
  function toMarkdown(items) {
    var lines = [];
    lines.push('# Tenant feedback' + (tenant ? ' for ' + tenant : ''));
    lines.push('');
    lines.push(items.length + ' item' + (items.length === 1 ? '' : 's') +
               ' collected via the on-site feedback widget.');
    lines.push('');

    items.forEach(function (item, i) {
      lines.push('---');
      lines.push('');
      lines.push('## ' + (i + 1) + '. ' + item.page_url);
      lines.push('Captured ' + item.sent_at +
                 (item.viewport ? ' - viewport ' + item.viewport.w + 'x' + item.viewport.h : ''));
      lines.push('');

      if (item.pins && item.pins.length) {
        lines.push('Pinned:');
        item.pins.forEach(function (p) {
          var line = '- `<' + p.tag + '>` `' + p.selector + '`';
          if (p.snippet) line += ' - "' + p.snippet + '"';
          lines.push(line);
        });
        lines.push('');
      }

      if (item.comment) {
        lines.push(item.comment);
        lines.push('');
      }
    });

    return lines.join('\n').trim() + '\n';
  }

  // ---- Mount -----------------------------------------------------------

  function mount() {
    if (document.getElementById(HOST_ID)) return;

    var host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = [
      'all: initial',
      'position: fixed !important',
      'bottom: 20px !important',
      'right: 20px !important',
      'z-index: 2147483647 !important',
      'pointer-events: auto !important'
    ].join(';');

    var shadow = host.attachShadow({ mode: 'closed' });

    shadow.innerHTML = [
      '<style>',
      ':host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; }',
      '* { box-sizing: border-box; }',
      // ---- Bubble (collapsed)
      '.bubble {',
      '  position: relative;',
      '  display: inline-flex; align-items: center; gap: 10px;',
      '  background: #ffffff; color: #0f172a;',
      '  padding: 10px 18px 10px 12px;',
      '  border-radius: 9999px; border: 1px solid rgba(15, 23, 42, 0.08);',
      '  font-size: 15px; font-weight: 600; line-height: 1;',
      '  cursor: pointer;',
      '  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.08);',
      '  transition: transform 140ms ease, box-shadow 140ms ease;',
      '}',
      '.bubble:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22), 0 4px 10px rgba(15, 23, 42, 0.1); }',
      '.bubble img { width: 36px; height: 36px; border-radius: 50%; display: block; background: #f1f5f9; }',
      '.bubble .label { padding-right: 2px; }',
      '.bubble .count {',
      '  position: absolute; top: -6px; right: -6px;',
      '  background: #2563eb; color: #fff;',
      '  font-size: 11px; font-weight: 700; line-height: 1;',
      '  min-width: 22px; height: 22px; padding: 0 6px;',
      '  border-radius: 9999px;',
      '  display: inline-flex; align-items: center; justify-content: center;',
      '  border: 2px solid #fff;',
      '  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);',
      '}',
      // ---- Panel (expanded)
      '.panel {',
      '  position: absolute; bottom: 72px; right: 0;',
      '  width: 380px; max-width: calc(100vw - 32px);',
      '  background: #fff;',
      '  border: 1px solid #e2e8f0; border-radius: 16px;',
      '  box-shadow: 0 32px 64px rgba(15, 23, 42, 0.22);',
      '  overflow: hidden;',
      '}',
      '.panel .top {',
      '  display: flex; align-items: center; gap: 10px;',
      '  padding: 14px 16px; border-bottom: 1px solid #f1f5f9;',
      '}',
      '.panel .top img { width: 28px; height: 28px; border-radius: 50%; }',
      '.panel .top .title { font-size: 14px; font-weight: 600; flex: 1; }',
      '.panel .top .close {',
      '  background: transparent; border: 0; cursor: pointer; padding: 4px;',
      '  color: #64748b; line-height: 0; border-radius: 6px;',
      '}',
      '.panel .top .close:hover { background: #f1f5f9; color: #0f172a; }',
      '.panel .sub { padding: 12px 16px 4px; font-size: 12px; color: #64748b; line-height: 1.45; }',
      '.panel .url { padding: 0 16px 12px; font-size: 11px; color: #94a3b8; word-break: break-all; }',
      // ---- Pins (in current draft)
      '.pins { padding: 0 16px 12px; display: flex; flex-wrap: wrap; gap: 6px; }',
      '.pin {',
      '  display: inline-flex; align-items: center; gap: 6px;',
      '  background: #eff6ff; color: #1e40af;',
      '  border: 1px solid #dbeafe; border-radius: 9999px;',
      '  padding: 4px 4px 4px 10px; font-size: 12px; font-weight: 500;',
      '  max-width: 100%;',
      '}',
      '.pin .text { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.pin button {',
      '  border: 0; background: transparent; color: inherit; cursor: pointer;',
      '  width: 18px; height: 18px; border-radius: 50%; line-height: 0;',
      '  display: inline-flex; align-items: center; justify-content: center;',
      '  font-size: 14px;',
      '}',
      '.pin button:hover { background: rgba(30, 64, 175, 0.12); }',
      '.pick-btn {',
      '  margin: 0 16px 12px; display: inline-flex; align-items: center; gap: 6px;',
      '  background: #f8fafc; color: #0f172a;',
      '  border: 1px dashed #cbd5e1; border-radius: 8px;',
      '  padding: 6px 12px; font-size: 12px; font-weight: 500; cursor: pointer;',
      '}',
      '.pick-btn:hover { border-color: #94a3b8; background: #f1f5f9; }',
      '.pick-btn svg { width: 12px; height: 12px; }',
      // ---- Textarea + Add
      '.panel textarea {',
      '  width: 100%; min-height: 100px; max-height: 240px;',
      '  border: 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;',
      '  padding: 12px 16px; font: inherit; font-size: 14px; color: #0f172a;',
      '  resize: vertical; outline: 0;',
      '}',
      '.panel textarea::placeholder { color: #94a3b8; }',
      '.row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; gap: 8px; }',
      '.row .hint { font-size: 11px; color: #94a3b8; }',
      '.btn {',
      '  border: 0; cursor: pointer; font-weight: 600;',
      '  padding: 8px 14px; border-radius: 8px; font-size: 13px;',
      '  display: inline-flex; align-items: center; gap: 6px;',
      '}',
      '.btn-primary { background: #0f172a; color: #fff; }',
      '.btn-primary:hover:not([disabled]) { background: #1e293b; }',
      '.btn-primary[disabled] { opacity: 0.5; cursor: not-allowed; }',
      '.btn-ghost { background: #f1f5f9; color: #0f172a; }',
      '.btn-ghost:hover { background: #e2e8f0; }',
      '.btn-danger { color: #b91c1c; background: transparent; padding: 8px 8px; }',
      '.btn-danger:hover { background: #fef2f2; }',
      // ---- Saved log
      '.saved { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 16px; }',
      '.saved-head { display: flex; align-items: center; gap: 8px; justify-content: space-between; margin-bottom: 8px; }',
      '.saved-head .count-label { font-size: 13px; font-weight: 600; color: #0f172a; }',
      '.saved-head .toggle { background: transparent; border: 0; cursor: pointer; color: #64748b; font-size: 12px; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }',
      '.saved-head .toggle:hover { background: #e2e8f0; color: #0f172a; }',
      '.saved-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; max-height: 200px; overflow-y: auto; }',
      '.saved-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 12px; color: #334155; line-height: 1.4; }',
      '.saved-item .meta { color: #94a3b8; font-size: 10px; margin-top: 2px; }',
      '.saved-actions { display: flex; gap: 8px; align-items: center; }',
      '.status { padding: 6px 16px 10px; font-size: 12px; }',
      '.status.ok    { color: #15803d; }',
      '.status.err   { color: #b91c1c; }',
      '.status.info  { color: #475569; }',
      // ---- Picker overlay
      '.overlay { position: fixed; pointer-events: none; background: rgba(37, 99, 235, 0.12); outline: 2px solid #2563eb; outline-offset: 0; border-radius: 4px; transition: all 60ms ease; }',
      '.overlay::after { content: attr(data-label); position: absolute; top: -22px; left: 0; background: #2563eb; color: #fff; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; white-space: nowrap; }',
      '.picker-banner { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #0f172a; color: #fff; font-size: 13px; font-weight: 500; padding: 10px 16px; border-radius: 9999px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.4); pointer-events: none; }',
      '[hidden] { display: none !important; }',
      '</style>',
      '<button class="bubble" type="button" aria-label="Open feedback widget" aria-haspopup="dialog">',
      '  <img src="', NUKIPA_LOGO, '" alt="">',
      '  <span class="label">', escapeHtml(label), '</span>',
      '  <span class="count" hidden>0</span>',
      '</button>',
      '<div class="panel" hidden role="dialog" aria-label="Send feedback">',
      '  <div class="top">',
      '    <img src="', NUKIPA_LOGO, '" alt="">',
      '    <span class="title">Feedback for your designer</span>',
      '    <button class="close" type="button" aria-label="Close">',
      '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      '    </button>',
      '  </div>',
      '  <p class="sub">Add as many items as you like. Pin sections to make the location unambiguous. Copy everything when you are done and paste it into the chat with your designer.</p>',
      '  <p class="url"></p>',
      '  <div class="pins" hidden></div>',
      '  <button class="pick-btn" type="button">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/></svg>',
      '    <span>Pin a section</span>',
      '  </button>',
      '  <textarea placeholder="e.g. the Hero headline should mention same-day shipping, and the testimonial photos look stock"></textarea>',
      '  <div class="row">',
      '    <span class="hint">Cmd/Ctrl + Enter to add</span>',
      '    <button class="btn btn-primary add" type="button" disabled>Add to feedback</button>',
      '  </div>',
      '  <p class="status" hidden></p>',
      '  <div class="saved" hidden>',
      '    <div class="saved-head">',
      '      <span class="count-label"></span>',
      '      <button class="toggle" type="button" aria-expanded="false">',
      '        <span class="toggle-label">Show</span>',
      '        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
      '      </button>',
      '    </div>',
      '    <div class="saved-list" hidden></div>',
      '    <div class="saved-actions">',
      '      <button class="btn btn-primary copy" type="button">',
      '        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      '        <span>Copy all</span>',
      '      </button>',
      '      <button class="btn btn-danger clear" type="button">Clear</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    var bubble    = shadow.querySelector('.bubble');
    var countEl   = shadow.querySelector('.bubble .count');
    var panel     = shadow.querySelector('.panel');
    var closeBtn  = shadow.querySelector('.close');
    var urlEl     = shadow.querySelector('.url');
    var pinsEl    = shadow.querySelector('.pins');
    var pickBtn   = shadow.querySelector('.pick-btn');
    var textEl    = shadow.querySelector('textarea');
    var addBtn    = shadow.querySelector('.add');
    var statusEl  = shadow.querySelector('.status');
    var savedEl   = shadow.querySelector('.saved');
    var savedHeadLabel = shadow.querySelector('.saved .count-label');
    var savedToggle    = shadow.querySelector('.saved .toggle');
    var savedToggleLabel = shadow.querySelector('.saved .toggle-label');
    var savedListEl   = shadow.querySelector('.saved-list');
    var copyBtn   = shadow.querySelector('.copy');
    var clearBtn  = shadow.querySelector('.clear');

    var pendingPins = [];
    var items       = loadItems();
    var listOpen    = false;
    var clearArmed  = false;
    var clearArmTimer = null;

    function setStatus(kind, msg, ttlMs) {
      statusEl.className = 'status ' + (kind || '');
      statusEl.textContent = msg || '';
      statusEl.hidden = !msg;
      if (ttlMs) setTimeout(function () {
        if (statusEl.textContent === msg) setStatus('', '');
      }, ttlMs);
    }

    function renderPins() {
      if (!pendingPins.length) { pinsEl.hidden = true; pinsEl.innerHTML = ''; return; }
      pinsEl.hidden = false;
      pinsEl.innerHTML = pendingPins.map(function (p, i) {
        var labelText = (p.snippet ? p.snippet : '<' + p.tag + '>').slice(0, 80);
        return [
          '<span class="pin">',
          '  <span class="text">', (i + 1), '. ', escapeHtml(labelText), '</span>',
          '  <button type="button" aria-label="Remove pin" data-remove="', i, '">x</button>',
          '</span>'
        ].join('');
      }).join('');
      var removes = pinsEl.querySelectorAll('button[data-remove]');
      for (var k = 0; k < removes.length; k++) {
        removes[k].addEventListener('click', function (event) {
          var idx = parseInt(event.currentTarget.getAttribute('data-remove'), 10);
          pendingPins.splice(idx, 1);
          renderPins();
          addBtn.disabled = !textEl.value.trim() && !pendingPins.length;
        });
      }
    }

    function renderCount() {
      var n = items.length;
      if (n === 0) {
        countEl.hidden = true;
        savedEl.hidden = true;
        return;
      }
      countEl.hidden = false;
      countEl.textContent = String(n);
      savedEl.hidden = false;
      savedHeadLabel.textContent = n + (n === 1 ? ' item saved' : ' items saved');
      renderSavedList();
    }

    function renderSavedList() {
      if (!listOpen) {
        savedListEl.hidden = true;
        savedListEl.innerHTML = '';
        savedToggleLabel.textContent = 'Show';
        savedToggle.setAttribute('aria-expanded', 'false');
        return;
      }
      savedListEl.hidden = false;
      savedToggleLabel.textContent = 'Hide';
      savedToggle.setAttribute('aria-expanded', 'true');
      savedListEl.innerHTML = items.map(function (item, i) {
        var head = (item.comment || '(pins only)').replace(/\s+/g, ' ').trim();
        if (head.length > 80) head = head.slice(0, 77) + '...';
        var path = '';
        try { path = new URL(item.page_url).pathname || '/'; } catch (e) { path = item.page_url; }
        var when = '';
        try { when = new Date(item.sent_at).toLocaleTimeString(); } catch (e) {}
        var pinNote = (item.pins && item.pins.length)
          ? ' - ' + item.pins.length + ' pin' + (item.pins.length === 1 ? '' : 's')
          : '';
        return [
          '<div class="saved-item">',
          (i + 1), '. ', escapeHtml(head),
          '<div class="meta">', escapeHtml(path), ' - ', escapeHtml(when), escapeHtml(pinNote), '</div>',
          '</div>'
        ].join('');
      }).join('');
    }

    function addCurrent() {
      var comment = textEl.value.trim();
      if (!comment && !pendingPins.length) return;
      items.push({
        id:         Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        sent_at:    new Date().toISOString(),
        page_url:   window.location.href,
        tenant:     tenant || window.location.host,
        viewport:   { w: window.innerWidth, h: window.innerHeight },
        user_agent: navigator.userAgent,
        pins:       pendingPins.slice(),
        comment:    comment
      });
      saveItems(items);
      textEl.value = '';
      pendingPins = [];
      addBtn.disabled = true;
      renderPins();
      renderCount();
      setStatus('ok', 'Added. Keep going or copy when ready.', 2200);
    }

    function copyAll() {
      // If the user typed but didn't click Add, fold the draft in so
      // nothing is lost. Most forgiving behaviour for a "Copy all" button.
      var draftComment = textEl.value.trim();
      var workingItems = items.slice();
      if (draftComment || pendingPins.length) {
        workingItems.push({
          id:         'draft',
          sent_at:    new Date().toISOString(),
          page_url:   window.location.href,
          tenant:     tenant || window.location.host,
          viewport:   { w: window.innerWidth, h: window.innerHeight },
          user_agent: navigator.userAgent,
          pins:       pendingPins.slice(),
          comment:    draftComment
        });
      }
      if (!workingItems.length) {
        setStatus('info', 'Nothing to copy yet.', 1800);
        return;
      }

      var markdown = toMarkdown(workingItems);
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        setStatus('err', 'Clipboard not available in this browser.');
        return;
      }
      navigator.clipboard.writeText(markdown).then(function () {
        setStatus('ok',
          'Copied ' + workingItems.length + ' item' +
          (workingItems.length === 1 ? '' : 's') +
          ' to clipboard. Paste into your designer chat.',
          3500);
      }).catch(function (err) {
        setStatus('err', 'Copy failed: ' + err.message);
      });
    }

    function disarmClear() {
      clearArmed = false;
      if (clearArmTimer) { clearTimeout(clearArmTimer); clearArmTimer = null; }
      clearBtn.textContent = 'Clear';
    }

    function onClearClick() {
      if (!items.length) return;
      if (!clearArmed) {
        clearArmed = true;
        clearBtn.textContent = 'Confirm clear';
        setStatus('info', 'Click "Confirm clear" to remove all ' + items.length + ' items.');
        clearArmTimer = setTimeout(function () {
          if (clearArmed) {
            disarmClear();
            setStatus('', '');
          }
        }, 4000);
        return;
      }
      items = [];
      saveItems(items);
      disarmClear();
      renderCount();
      setStatus('ok', 'Cleared.', 1800);
    }

    function openPanel() {
      urlEl.textContent = window.location.href;
      panel.hidden = false;
      bubble.setAttribute('aria-expanded', 'true');
      renderCount();
      setTimeout(function () { textEl.focus(); }, 0);
    }

    function closePanel() {
      panel.hidden = true;
      bubble.setAttribute('aria-expanded', 'false');
      setStatus('', '');
      disarmClear();
    }

    bubble.addEventListener('click', function () {
      if (panel.hidden) openPanel(); else closePanel();
    });
    closeBtn.addEventListener('click', closePanel);

    textEl.addEventListener('input', function () {
      addBtn.disabled = !textEl.value.trim() && !pendingPins.length;
    });

    document.addEventListener('keydown', function (event) {
      if (panel.hidden) return;
      if (event.key === 'Escape' && !pickerActive) closePanel();
    });

    textEl.addEventListener('keydown', function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!addBtn.disabled) addCurrent();
      }
    });

    addBtn.addEventListener('click', addCurrent);
    copyBtn.addEventListener('click', copyAll);
    clearBtn.addEventListener('click', onClearClick);
    pickBtn.addEventListener('click', startPicker);
    savedToggle.addEventListener('click', function () {
      listOpen = !listOpen;
      renderSavedList();
    });

    // ---- Section picker ----------------------------------------------

    var pickerActive = false;

    function startPicker() {
      if (pickerActive) return;
      pickerActive = true;
      panel.hidden = true;
      host.style.pointerEvents = 'none';
      document.documentElement.style.cursor = 'crosshair';

      var overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.style.display = 'none';
      shadow.appendChild(overlay);

      var banner = document.createElement('div');
      banner.className = 'picker-banner';
      banner.textContent = 'Click a section to pin it - ESC to cancel';
      shadow.appendChild(banner);

      var currentTarget = null;

      function paint(el) {
        var r = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top    = r.top    + 'px';
        overlay.style.left   = r.left   + 'px';
        overlay.style.width  = r.width  + 'px';
        overlay.style.height = r.height + 'px';
        overlay.setAttribute('data-label', el.tagName.toLowerCase());
      }

      function onMove(event) {
        var el = document.elementFromPoint(event.clientX, event.clientY);
        if (!el || el === host || (host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
          return;
        }
        currentTarget = el;
        paint(el);
      }

      function onClick(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (currentTarget) {
          pendingPins.push({
            selector: cssPath(currentTarget),
            snippet:  snippetOf(currentTarget),
            tag:      currentTarget.tagName.toLowerCase(),
            rect:     rectOf(currentTarget)
          });
        }
        cleanup();
        renderPins();
        addBtn.disabled = !textEl.value.trim() && !pendingPins.length;
        openPanel();
      }

      function onKey(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          cleanup();
          openPanel();
        }
      }

      function cleanup() {
        pickerActive = false;
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('click',     onClick, true);
        document.removeEventListener('keydown',   onKey,   true);
        document.documentElement.style.cursor = '';
        host.style.pointerEvents = 'auto';
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (banner.parentNode)  banner.parentNode.removeChild(banner);
      }

      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('click',     onClick, true);
      document.addEventListener('keydown',   onKey,   true);
    }

    // ---- beforeunload guard ------------------------------------------
    //
    // Browsers ignore the custom message and show their own generic
    // "Leave site? Changes you made may not be saved" prompt - fine,
    // the goal is just to stop accidental closes when feedback is
    // unsent-typed or saved-but-not-copied.

    window.addEventListener('beforeunload', function (event) {
      var dirty = items.length > 0
                  || textEl.value.trim().length > 0
                  || pendingPins.length > 0;
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    });

    // Multi-tab sync. If another tab adds/clears, mirror state here.
    window.addEventListener('storage', function (event) {
      if (event.key !== STORAGE_KEY) return;
      items = loadItems();
      renderCount();
    });

    document.body.appendChild(host);
    renderCount();
  }

  // Re-mount guard.
  function watch() {
    var observer = new MutationObserver(function () {
      if (!document.getElementById(HOST_ID)) mount();
    });
    observer.observe(document.body, { childList: true, subtree: false });
  }

  ready(function () {
    mount();
    watch();
  });
})();
