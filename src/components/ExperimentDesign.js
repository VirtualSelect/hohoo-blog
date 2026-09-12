import React from 'react';
import { useEnglish } from './ContentUI';
export default function ExperimentDesign({ entry }) {
  const en = useEnglish();
  const d = entry.design?.[en ? 'en' : 'zh'];
  if (!d) return null;
  return (
    <>
      <p className="hh-meta">
        {en ? 'PROPOSED DESIGN · Not executed' : '实验设计草案 · 尚未执行'}
      </p>
      {[
        ['02 / HYPOTHESIS', d.hypothesis],
        ['03 / VARIABLES', null],
        [
          '04 / DATASET',
          d.dataset ||
            (en
              ? 'NOT DEFINED YET'
              : '尚未确定。执行前记录数据来源、许可、样本与划分。'),
        ],
        ['05 / BASELINE', d.baseline],
        ['06 / METRICS', d.metrics],
        ['07 / SUCCESS CRITERIA', d.successCriteria],
        ['08 / RISKS', d.risks],
        [
          '09 / REPRODUCE',
          d.reproduce ||
            (en
              ? 'Code, configuration and data will be recorded when the experiment runs.'
              : '执行后补充代码、配置、数据版本与运行命令。'),
        ],
      ].map(([label, text]) => (
        <section className="hh-section" key={label}>
          <h2 className="hh-eyebrow">{label}</h2>
          {label.includes('VARIABLES') ? (
            <dl className="hh-definition">
              {['independent', 'controlled', 'dependent'].map((key, i) => (
                <React.Fragment key={key}>
                  <dt>
                    {en
                      ? ['Independent', 'Controlled', 'Dependent'][i]
                      : ['自变量', '控制变量', '因变量'][i]}
                  </dt>
                  <dd>{d.variables[key]}</dd>
                </React.Fragment>
              ))}
            </dl>
          ) : (
            <p>{text}</p>
          )}
        </section>
      ))}
    </>
  );
}
